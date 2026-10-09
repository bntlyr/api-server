import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import { createError } from "../../../graphql/common/error.helper.js";
import { FinishedGoodsAllocationRequestLoader } from "./fg-allocation.loader.js";
import { FinishedGoodsInventoryLoader } from "../../inventory/finished-goods-inventory/finished-goods-inventory.loader.js";
import { SalesOrderLoader } from "../../sales/sales-order/sales-order.loader.js";
import { generateFGTransactionNo } from "../../inventory/finished-goods-inventory/helpers/finished-goods-inventory.helper.js";
import { NotificationService } from "../../../notification/notification.service.js";
import type {
  AvailableFgStockForOrder,
  SubmitFgAllocationsInput,
  SubmitFgAllocationsPayload,
  FinishedGoodsAllocationRequestPayload,
} from "../../../generated/graphql/types.js";
import { Prisma } from "../../../generated/prisma/client.js";

@Injectable()
export class FinishedGoodsAllocationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loader: FinishedGoodsAllocationRequestLoader,
    private readonly fgLotLoader: FinishedGoodsInventoryLoader,
    private readonly salesOrderLoader: SalesOrderLoader,
    private readonly auditService: AuditTrailService,
    private readonly notificationService: NotificationService,
  ) {}

  async findById(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    if (Number.isNaN(parsedId)) return null;
    return this.loader.byId.load(parsedId);
  }

  async findBySalesOrderId(salesOrderId: number | string) {
    const parsedId = typeof salesOrderId === "string" ? parseInt(salesOrderId, 10) : salesOrderId;
    if (Number.isNaN(parsedId)) return [];
    return this.loader.bySalesOrderId.load(parsedId);
  }

  /**
   * Combined query: returns available physical lots in STOCK area and merges
   * any existing allocation request data for the given Sales Order.
   */
  async getAvailableFgStockForOrder(salesOrderId: number | string): Promise<AvailableFgStockForOrder[]> {
    const parsedSalesOrderId = typeof salesOrderId === "string" ? parseInt(salesOrderId, 10) : salesOrderId;
    if (Number.isNaN(parsedSalesOrderId)) return [];

    const salesOrder = await this.prisma.salesOrder.findFirst({
      where: { id: parsedSalesOrderId, deletedAt: null },
      include: {
        item: true,
        fabrication: true,
      },
    });

    if (!salesOrder || !salesOrder.itemId) return [];

    // 1. Fetch existing non-deleted allocation requests for this Sales Order
    const existingRequests = await this.prisma.finishedGoodsAllocationRequest.findMany({
      where: {
        salesOrderId: parsedSalesOrderId,
        deletedAt: null,
      },
    });

    const requestsByLotId = new Map<number, any>();
    for (const req of existingRequests) {
      if (req.finishedGoodsLotId) {
        requestsByLotId.set(req.finishedGoodsLotId, req);
      }
    }

    const requestedLotIds = [...requestsByLotId.keys()];

    // 2. Build lot search condition matching item and fabrication rules
    const targetItemId = salesOrder.itemId;
    const targetFabId = salesOrder.fabricationId;

    let fabCondition: Prisma.FinishedGoodsLotWhereInput;
    if (targetFabId) {
      // Order has fabrication: match exact fab lots OR base item lots (fabricationId = 0 or code = '000')
      fabCondition = {
        itemId: targetItemId,
        OR: [
          { fabricationId: targetFabId },
          { fabrication: { code: "000" } },
        ],
      };
    } else {
      // Order is base item: match base item lots only
      fabCondition = {
        itemId: targetItemId,
        fabrication: { code: "000" },
      };
    }

    const lots = await this.prisma.finishedGoodsLot.findMany({
      where: {
        ...fabCondition,
        area: { category: "STOCK" },
        deletedAt: null,
        OR: [
          { availableQty: { gt: 0 } },
          { id: { in: requestedLotIds } },
        ],
      },
      include: {
        item: true,
        fabrication: true,
        area: true,
        location: true,
      },
      orderBy: [{ incomingDate: "asc" }, { id: "asc" }],
    });

    // 3. Merge lot data with allocation state per row
    return lots.map((lot) => {
      const existingReq = requestsByLotId.get(lot.id);
      return {
        lotId: String(lot.id),
        orderNo: lot.orderNo,
        lotNo: lot.lotNo,
        postfix: lot.fabrication?.code ?? "000",
        manufactureDate: lot.manufactureDate ? lot.manufactureDate.toISOString() : null,
        availableQty: Number(lot.availableQty ?? 0),
        allocatedQty: Number(lot.allocatedQty ?? 0),
        areaId: lot.areaId,
        area: lot.area as any,
        locationId: lot.locationId,
        location: lot.location as any,
        requestId: existingReq ? String(existingReq.id) : null,
        allocationQty: existingReq ? Number(existingReq.allocationQty ?? 0) : 0,
        status: existingReq ? existingReq.status : null,
        rejectionReason: existingReq?.rejectionReason ?? null,
        remarks: existingReq?.remarks ?? null,
      };
    });
  }

  /**
   * Batch / Row submit of allocation requests from the interactive table.
   */
  async submitFgAllocations(
    input: SubmitFgAllocationsInput,
    context: any,
  ): Promise<SubmitFgAllocationsPayload> {
    const { userId, ipAddress, userAgent } = extractContextInfo(context);
    const salesOrderId = parseInt(String(input.salesOrderId), 10);

    if (Number.isNaN(salesOrderId)) {
      return {
        success: false,
        requests: [],
        userErrors: [createError("Invalid Sales Order ID", "INVALID_INPUT")],
      };
    }

    const salesOrder = await this.prisma.salesOrder.findFirst({
      where: { id: salesOrderId, deletedAt: null },
    });

    if (!salesOrder) {
      return {
        success: false,
        requests: [],
        userErrors: [createError("Sales Order not found", "NOT_FOUND")],
      };
    }

    const savedRequests: any[] = [];

    try {
      await this.prisma.$transaction(async (tx) => {
        for (const item of input.allocations) {
          const lotId = parseInt(String(item.lotId), 10);
          const requestedQty = Number(item.allocationQty);

          const lot = await tx.finishedGoodsLot.findFirst({
            where: { id: lotId, deletedAt: null },
          });

          if (!lot) continue;

          // Find existing request on this lot for this sales order
          const existingReq = await tx.finishedGoodsAllocationRequest.findFirst({
            where: {
              salesOrderId,
              finishedGoodsLotId: lotId,
              deletedAt: null,
            },
          });

          if (requestedQty <= 0) {
            // If qty is 0 and request is in "Pending" status, cancel it
            if (existingReq && existingReq.status === "Pending") {
              await tx.finishedGoodsAllocationRequest.update({
                where: { id: existingReq.id },
                data: {
                  status: "Canceled",
                  deleted: true,
                  deletedAt: new Date(),
                  deletedBy: userId,
                },
              });
            }
            continue;
          }

          // Validate requested quantity
          if (requestedQty > Number(lot.availableQty)) {
            throw new Error(
              `Requested allocation (${requestedQty}) exceeds available lot stock (${lot.availableQty}) for Lot ${lot.lotNo}`,
            );
          }

          if (existingReq) {
            // Update existing request
            const updated = await tx.finishedGoodsAllocationRequest.update({
              where: { id: existingReq.id },
              data: {
                allocationQty: requestedQty,
                status: "Pending",
                rejectionReason: null,
                remarks: item.remarks ?? existingReq.remarks,
                updatedById: userId,
              },
            });
            savedRequests.push(updated);
          } else {
            // Create new request
            const created = await tx.finishedGoodsAllocationRequest.create({
              data: {
                salesOrderId,
                finishedGoodsLotId: lotId,
                allocationQty: requestedQty,
                status: "Pending",
                remarks: item.remarks ?? "",
                createdById: userId,
                updatedById: userId,
              },
            });
            savedRequests.push(created);
          }
        }
      });

      this.loader.clear();

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        tableName: "FinishedGoodsAllocationRequest",
        recordId: String(salesOrderId),
        action: "SUBMIT_ALLOCATIONS",
        values: { count: savedRequests.length },
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent || "Unknown",
      });

      // Notify Warehouse / Inventory Approvers
      if (savedRequests.length > 0) {
        const approverUsers = await this.prisma.user.findMany({
          where: {
            deletedAt: null,
            OR: [
              { superAdmin: true },
              { section: { name: { in: ["Warehouse", "Inventory", "Finished Goods", "Shipping"] } } },
            ],
          },
          select: { id: true },
        });

        if (approverUsers.length > 0) {
          const salesOrder = await this.prisma.salesOrder.findUnique({
            where: { id: salesOrderId },
            select: { orderNo: true },
          });
          const orderNo = salesOrder?.orderNo ?? `SO-${salesOrderId}`;

          await this.notificationService.send(
            {
              userIds: approverUsers.map((u) => u.id),
              title: `New FG Allocation Request: ${orderNo}`,
              message: `${userId ?? "Planner"} submitted FG allocation requests for Sales Order ${orderNo} (${savedRequests.length} lot(s)).`,
              metadata: {
                type: "FG_ALLOCATION_REQUEST",
                salesOrderId,
                orderNo,
                count: savedRequests.length,
              },
            },
            context,
          );
        }
      }

      return {
        success: true,
        requests: savedRequests as any,
        userErrors: [],
      };
    } catch (error: any) {
      return {
        success: false,
        requests: [],
        userErrors: [createError(error.message || "Failed to submit allocation requests", "ALLOCATION_FAILED")],
      };
    }
  }

  /**
   * Warehouse Review & Approval (SIV-23):
   * Sets Area & Location, deducts physical stock, writes FG Transaction, updates Sales Order.
   */
  async approveFinishedGoodsAllocationRequest(
    id: number | string,
    destinationAreaId: number,
    destinationLocationId: number,
    remarks: string | null | undefined,
    context: any,
  ): Promise<FinishedGoodsAllocationRequestPayload> {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    const { userId, ipAddress, userAgent } = extractContextInfo(context);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const req = await tx.finishedGoodsAllocationRequest.findFirst({
          where: { id: parsedId, deletedAt: null },
        });

        if (!req) {
          throw new Error("Allocation request not found");
        }

        if (req.status !== "Pending") {
          throw new Error(`Allocation request is not in 'Pending' status (current status: ${req.status})`);
        }

        const lot = await tx.finishedGoodsLot.findFirst({
          where: { id: req.finishedGoodsLotId!, deletedAt: null },
        });

        if (!lot) {
          throw new Error("Finished goods lot not found");
        }

        const allocQty = Number(req.allocationQty);
        if (Number(lot.availableQty) < allocQty) {
          throw new Error(
            `Insufficient available lot stock (${lot.availableQty}) for requested allocation (${allocQty})`,
          );
        }

        const salesOrder = req.salesOrderId
          ? await tx.salesOrder.findFirst({ where: { id: req.salesOrderId } })
          : null;

        // 1. Atomic decrement of available stock and increment of allocated stock
        await tx.finishedGoodsLot.update({
          where: { id: lot.id },
          data: {
            availableQty: { decrement: allocQty },
            allocatedQty: { increment: allocQty },
            updatedBy: userId,
          },
        });

        // 2. Write immutable FG transaction ledger
        const transactionNo = generateFGTransactionNo("ALLOC");
        await tx.finishedGoodsTransaction.create({
          data: {
            transactionNo,
            direction: "INTERNAL",
            transactionType: "ALLOCATION",
            quantity: allocQty,
            fromStatus: "AVAILABLE",
            toStatus: "ALLOCATED",
            fromAreaId: lot.areaId,
            toAreaId: destinationAreaId,
            fromLocationId: lot.locationId,
            toLocationId: destinationLocationId,
            fromBoxId: lot.boxId,
            toBoxId: lot.boxId,
            itemId: lot.itemId,
            fabricationId: lot.fabricationId,
            finishedGoodsLotId: lot.id,
            orderNo: lot.orderNo,
            lotNo: lot.lotNo,
            chargeNo: lot.chargeNo,
            referenceNo: salesOrder?.orderNo ?? "",
            invoiceNo: salesOrder?.salesOrderNo ?? "",
            reason: remarks || "Sales Order FG Allocation",
            createdBy: userId,
            updatedBy: userId,
          },
        });

        // 3. Update Sales Order allocatedQty and check if fully planned
        if (req.salesOrderId && salesOrder) {
          const currentAllocated = Number(salesOrder.allocatedQty ?? 0);
          const newAllocated = currentAllocated + allocQty;
          const orderQty = Number(salesOrder.orderQty ?? 0);

          const soUpdateData: Prisma.SalesOrderUpdateInput = {
            allocatedQty: { increment: allocQty },
            updatedBy: userId,
          };

          if (newAllocated >= orderQty) {
            soUpdateData.productionPlanningStatus = "Planned";
            soUpdateData.status = "Shipping";
            soUpdateData.shippingStatus = "For-Shipment";
          }

          await tx.salesOrder.update({
            where: { id: req.salesOrderId },
            data: soUpdateData,
          });
        }

        // 4. Update request status to Accepted
        const updatedReq = await tx.finishedGoodsAllocationRequest.update({
          where: { id: req.id },
          data: {
            status: "Accepted",
            destinationAreaId,
            destinationLocationId,
            remarks: remarks ?? req.remarks,
            approvedAt: new Date(),
            approvedBy: userId,
            updatedById: userId,
          },
        });

        return updatedReq;
      });

      this.loader.clear(parsedId);
      this.fgLotLoader.clear();
      this.salesOrderLoader.clear();

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        tableName: "FinishedGoodsAllocationRequest",
        recordId: String(result.id),
        action: "APPROVE_ALLOCATION",
        values: result,
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent || "Unknown",
      });

      // Notify Requestor & Sales Order PIC
      if (result.createdById) {
        const salesOrder = result.salesOrderId
          ? await this.prisma.salesOrder.findUnique({
              where: { id: result.salesOrderId },
              select: { orderNo: true, createdBy: true },
            })
          : null;
        const orderNo = salesOrder?.orderNo ?? `SO-${result.salesOrderId}`;
        const recipients = [...new Set([result.createdById, salesOrder?.createdBy].filter(Boolean) as string[])];

        if (recipients.length > 0) {
          await this.notificationService.send(
            {
              userIds: recipients,
              title: `FG Allocation Approved: ${orderNo}`,
              message: `Allocation request of ${result.allocationQty} pcs for Order ${orderNo} has been approved.`,
              metadata: {
                type: "FG_ALLOCATION_APPROVED",
                requestId: result.id,
                salesOrderId: result.salesOrderId,
                orderNo,
                allocationQty: Number(result.allocationQty),
              },
            },
            context,
          );
        }
      }

      return {
        request: result as any,
        userErrors: [],
      };
    } catch (error: any) {
      return {
        request: null,
        userErrors: [createError(error.message || "Failed to approve allocation request", "APPROVE_FAILED")],
      };
    }
  }

  /**
   * Warehouse Review: Rejection
   */
  async rejectFinishedGoodsAllocationRequest(
    id: number | string,
    reason: string,
    context: any,
  ): Promise<FinishedGoodsAllocationRequestPayload> {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    const { userId, ipAddress, userAgent } = extractContextInfo(context);

    try {
      const existing = await this.prisma.finishedGoodsAllocationRequest.findFirst({
        where: { id: parsedId, deletedAt: null },
      });

      if (!existing) {
        return {
          request: null,
          userErrors: [createError("Allocation request not found", "NOT_FOUND")],
        };
      }

      if (existing.status !== "Pending") {
        return {
          request: null,
          userErrors: [createError(`Cannot reject request in status '${existing.status}'`, "INVALID_STATE")],
        };
      }

      const updated = await this.prisma.finishedGoodsAllocationRequest.update({
        where: { id: parsedId },
        data: {
          status: "Rejected",
          rejectionReason: reason,
          updatedById: userId,
        },
      });

      this.loader.clear(parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        tableName: "FinishedGoodsAllocationRequest",
        recordId: String(updated.id),
        action: "REJECT_ALLOCATION",
        values: { reason },
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent || "Unknown",
      });

      // Notify Requestor
      if (existing.createdById) {
        const salesOrder = existing.salesOrderId
          ? await this.prisma.salesOrder.findUnique({
              where: { id: existing.salesOrderId },
              select: { orderNo: true },
            })
          : null;
        const orderNo = salesOrder?.orderNo ?? `SO-${existing.salesOrderId}`;

        await this.notificationService.send(
          {
            userIds: existing.createdById,
            title: `FG Allocation Rejected: ${orderNo}`,
            message: `Allocation request for Order ${orderNo} was rejected. Reason: ${reason || "No reason provided."}`,
            metadata: {
              type: "FG_ALLOCATION_REJECTED",
              requestId: existing.id,
              salesOrderId: existing.salesOrderId,
              orderNo,
              reason,
            },
          },
          context,
        );
      }

      return {
        request: updated as any,
        userErrors: [],
      };
    } catch (error: any) {
      return {
        request: null,
        userErrors: [createError(error.message || "Failed to reject allocation request", "REJECT_FAILED")],
      };
    }
  }

  /**
   * Planner: Cancel pending request
   */
  async cancelFinishedGoodsAllocationRequest(
    id: number | string,
    context: any,
  ): Promise<FinishedGoodsAllocationRequestPayload> {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    const { userId, ipAddress, userAgent } = extractContextInfo(context);

    try {
      const existing = await this.prisma.finishedGoodsAllocationRequest.findFirst({
        where: { id: parsedId, deletedAt: null },
      });

      if (!existing) {
        return {
          request: null,
          userErrors: [createError("Allocation request not found", "NOT_FOUND")],
        };
      }

      if (existing.status !== "Pending") {
        return {
          request: null,
          userErrors: [createError(`Cannot cancel request in status '${existing.status}'`, "INVALID_STATE")],
        };
      }

      const updated = await this.prisma.finishedGoodsAllocationRequest.update({
        where: { id: parsedId },
        data: {
          status: "Canceled",
          deleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
          updatedById: userId,
        },
      });

      this.loader.clear(parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        tableName: "FinishedGoodsAllocationRequest",
        recordId: String(updated.id),
        action: "CANCEL_ALLOCATION",
        values: updated,
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent || "Unknown",
      });

      return {
        request: updated as any,
        userErrors: [],
      };
    } catch (error: any) {
      return {
        request: null,
        userErrors: [createError(error.message || "Failed to cancel allocation request", "CANCEL_FAILED")],
      };
    }
  }
}
