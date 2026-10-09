import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { AuditTrailService } from "../../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../../graphql/common/context.helper.js";
import { createError } from "../../../graphql/common/error.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../../graphql/common/pagination.helper.js";
import type {
  CreateSalesOrderInput,
  UpdateSalesOrderInput,
  UploadSalesOrdersInput,
  SalesOrderConnection,
  SalesOrderFilterInput,
  SalesOrderPayload,
  SalesOrderUploadResult,
  SalesOrderUploadError,
  PaginationInput,
} from "../../../generated/graphql/types.js";
import {
  buildSalesOrderWhere,
  applyTransformRules,
  runValidationRules,
  generateNextOrderNo,
} from "./helpers/sales-order.helper.js";
import type {
  SalesOrderRuleContext,
  ResolvedItemContext,
} from "./helpers/sales-order-validation.types.js";
import { SalesOrderLoader } from "./sales-order.loader.js";
import type { Prisma } from "../../../generated/prisma/client.js";

const CUSTOMERS_WITH_PRESET_ORDER_NO = new Set(["CJC", "CAC"]);

@Injectable()
export class SalesOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loader: SalesOrderLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findById(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    if (Number.isNaN(parsedId)) return null;
    return this.loader.byId.load(parsedId);
  }

  async findByOrderNo(orderNo: string) {
    if (!orderNo) return null;
    return this.loader.byOrderNo.load(orderNo);
  }

  async findPaginated(
    pagination?: PaginationInput | null,
    filter?: SalesOrderFilterInput | null,
  ): Promise<SalesOrderConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildSalesOrderWhere(filter);

      const [items, totalCount] = await Promise.all([
        this.prisma.salesOrder.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: [{ salesOrderDate: "desc" }, { id: "desc" }],
        }),
        this.prisma.salesOrder.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));
      return {
        ...connection,
        userErrors: [],
      } as unknown as SalesOrderConnection;
    } catch (error) {
      return {
        edges: [],
        nodes: [],
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: null,
          endCursor: null,
        },
        totalCount: 0,
        userErrors: [createError("Failed to fetch sales orders", "SERVER_ERROR")],
      };
    }
  }

  async create(input: CreateSalesOrderInput, context: any): Promise<SalesOrderPayload> {
    const { userId, ipAddress, userAgent } = extractContextInfo(context);

    try {
      const order = await this.prisma.$transaction(async (tx) => {
        let finalOrderNo = input.orderNo?.trim();

        // If not provided, generate default order no
        if (!finalOrderNo) {
          finalOrderNo = await generateNextOrderNo("SO", tx);
        }

        // Look up item and customer by itemCode
        const matchedItem = await tx.item.findFirst({
          where: { itemCode: input.itemCode },
        });

        let matchedFabId: number | null = null;
        if (matchedItem) {
          const defaultFab = await tx.fabrication.findFirst({
            where: { itemId: matchedItem.id },
          });
          matchedFabId = defaultFab?.id ?? null;
        }

        const created = await tx.salesOrder.create({
          data: {
            orderNo: finalOrderNo,
            salesOrderNo: input.salesOrderNo,
            salesOrderDate: new Date(input.salesOrderDate),
            itemCode: input.itemCode,
            orderCode: input.orderCode,
            orderQty: input.orderQty,
            originalQty: input.orderQty,
            revisedQty: 0,
            freightType: input.freightType,
            requestedETD: new Date(input.requestedETD),
            rad: new Date(input.rad),
            committedETD: input.committedETD ? new Date(input.committedETD) : null,
            remarks: input.remarks ?? "",
            shippingLotNo: input.shippingLotNo ?? "",
            prodNo: input.prodNo,
            shippingTo: input.shippingTo ?? "",
            classOrder: input.classOrder ?? "",
            endUser: input.endUser ?? "",
            asgdShipment: input.asgdShipment ?? "",
            status: input.status ?? "Pending",
            productionPlanningStatus: input.productionPlanningStatus ?? "Locked",
            productionStatus: input.productionStatus ?? "Pending",
            shippingStatus: input.shippingStatus ?? "For-Shipment",
            itemId: matchedItem ? matchedItem.id : null,
            fabricationId: matchedFabId,
            customerId: matchedItem?.customerId ?? null,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        return created;
      });

      this.loader.clear();

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        tableName: "SalesOrder",
        recordId: String(order.id),
        action: "CREATE",
        values: order,
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent || "Unknown",
      });

      return { order: order as any, userErrors: [] };
    } catch (error: any) {
      return {
        order: null,
        userErrors: [createError(error.message || "Failed to create sales order", "CREATE_FAILED")],
      };
    }
  }

  async update(id: number | string, input: UpdateSalesOrderInput, context: any): Promise<SalesOrderPayload> {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    const { userId, ipAddress, userAgent } = extractContextInfo(context);

    try {
      const existing = await this.prisma.salesOrder.findFirst({
        where: { id: parsedId, deletedAt: null },
      });

      if (!existing) {
        return {
          order: null,
          userErrors: [createError("Sales Order not found", "NOT_FOUND")],
        };
      }

      const updateData: Prisma.SalesOrderUpdateInput = {
        updatedBy: userId,
      };

      if (input.orderNo != null) updateData.orderNo = input.orderNo;
      if (input.salesOrderNo != null) updateData.salesOrderNo = input.salesOrderNo;
      if (input.salesOrderDate != null) updateData.salesOrderDate = new Date(input.salesOrderDate);
      if (input.itemCode != null) updateData.itemCode = input.itemCode;
      if (input.orderCode != null) updateData.orderCode = input.orderCode;
      if (input.orderQty != null) {
        updateData.orderQty = input.orderQty;
        if (Number(existing.orderQty) !== Number(input.orderQty)) {
          updateData.revisedQty = input.orderQty;
        }
      }
      if (input.freightType != null) updateData.freightType = input.freightType;
      if (input.requestedETD != null) updateData.requestedETD = new Date(input.requestedETD);
      if (input.rad != null) updateData.rad = new Date(input.rad);
      if (input.committedETD !== undefined) {
        updateData.committedETD = input.committedETD ? new Date(input.committedETD) : null;
      }
      if (input.remarks !== undefined) updateData.remarks = input.remarks ?? "";
      if (input.shippingLotNo !== undefined) updateData.shippingLotNo = input.shippingLotNo ?? "";
      if (input.prodNo != null) updateData.prodNo = input.prodNo;
      if (input.shippingTo !== undefined) updateData.shippingTo = input.shippingTo ?? "";
      if (input.classOrder !== undefined) updateData.classOrder = input.classOrder ?? "";
      if (input.endUser !== undefined) updateData.endUser = input.endUser ?? "";
      if (input.asgdShipment !== undefined) updateData.asgdShipment = input.asgdShipment ?? "";
      if (input.status != null) updateData.status = input.status;
      if (input.productionPlanningStatus != null) updateData.productionPlanningStatus = input.productionPlanningStatus;
      if (input.productionStatus != null) updateData.productionStatus = input.productionStatus;
      if (input.shippingStatus != null) updateData.shippingStatus = input.shippingStatus;

      const updated = await this.prisma.salesOrder.update({
        where: { id: parsedId },
        data: updateData,
      });

      this.loader.clear(parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        tableName: "SalesOrder",
        recordId: String(updated.id),
        action: "UPDATE",
        values: { before: existing, after: updated },
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent || "Unknown",
      });

      return { order: updated as any, userErrors: [] };
    } catch (error: any) {
      return {
        order: null,
        userErrors: [createError(error.message || "Failed to update sales order", "UPDATE_FAILED")],
      };
    }
  }

  async delete(id: number | string, context: any): Promise<SalesOrderPayload> {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    const { userId, ipAddress, userAgent } = extractContextInfo(context);

    try {
      const existing = await this.prisma.salesOrder.findFirst({
        where: { id: parsedId, deletedAt: null },
      });

      if (!existing) {
        return {
          order: null,
          userErrors: [createError("Sales Order not found", "NOT_FOUND")],
        };
      }

      const deleted = await this.prisma.salesOrder.update({
        where: { id: parsedId },
        data: {
          deleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      this.loader.clear(parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        tableName: "SalesOrder",
        recordId: String(deleted.id),
        action: "DELETE",
        values: existing,
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent || "Unknown",
      });

      return { order: deleted as any, userErrors: [] };
    } catch (error: any) {
      return {
        order: null,
        userErrors: [createError(error.message || "Failed to delete sales order", "DELETE_FAILED")],
      };
    }
  }

  async restore(id: number | string, context: any): Promise<SalesOrderPayload> {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    const { userId, ipAddress, userAgent } = extractContextInfo(context);

    try {
      const existing = await this.prisma.salesOrder.findFirst({
        where: { id: parsedId },
      });

      if (!existing || !existing.deletedAt) {
        return {
          order: null,
          userErrors: [createError("Deleted Sales Order not found", "NOT_FOUND")],
        };
      }

      const restored = await this.prisma.salesOrder.update({
        where: { id: parsedId },
        data: {
          deleted: false,
          deletedAt: null,
          deletedBy: null,
          updatedBy: userId,
        },
      });

      this.loader.clear(parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        tableName: "SalesOrder",
        recordId: String(restored.id),
        action: "RESTORE",
        values: restored,
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent || "Unknown",
      });

      return { order: restored as any, userErrors: [] };
    } catch (error: any) {
      return {
        order: null,
        userErrors: [createError(error.message || "Failed to restore sales order", "RESTORE_FAILED")],
      };
    }
  }

  async cancel(id: number | string, reason: string | null | undefined, context: any): Promise<SalesOrderPayload> {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    const { userId, ipAddress, userAgent } = extractContextInfo(context);

    try {
      const existing = await this.prisma.salesOrder.findFirst({
        where: { id: parsedId, deletedAt: null },
      });

      if (!existing) {
        return {
          order: null,
          userErrors: [createError("Sales Order not found", "NOT_FOUND")],
        };
      }

      if (existing.status === "Cancelled") {
        return {
          order: existing as any,
          userErrors: [],
        };
      }

      const cancelledRemarks = reason
        ? existing.remarks
          ? `${existing.remarks}\n[Cancelled: ${reason}]`
          : `[Cancelled: ${reason}]`
        : existing.remarks;

      const cancelled = await this.prisma.$transaction(async (tx) => {
        // 1. Cancel Sales Order and set all phase statuses to Cancelled
        const so = await tx.salesOrder.update({
          where: { id: parsedId },
          data: {
            status: "Cancelled",
            productionPlanningStatus: "Cancelled",
            productionStatus: "Cancelled",
            shippingStatus: "Cancelled",
            remarks: cancelledRemarks,
            updatedBy: userId,
          },
        });

        // 2. Automatically cancel any pending allocation requests
        await tx.finishedGoodsAllocationRequest.updateMany({
          where: {
            salesOrderId: parsedId,
            status: "Pending",
            deletedAt: null,
          },
          data: {
            status: "Canceled",
            deleted: true,
            deletedAt: new Date(),
            deletedBy: userId,
            updatedById: userId,
          },
        });

        return so;
      });

      this.loader.clear(parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        tableName: "SalesOrder",
        recordId: String(cancelled.id),
        action: "CANCEL",
        values: { before: existing, after: cancelled, reason },
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent || "Unknown",
      });

      return { order: cancelled as any, userErrors: [] };
    } catch (error: any) {
      return {
        order: null,
        userErrors: [createError(error.message || "Failed to cancel sales order", "CANCEL_FAILED")],
      };
    }
  }

  /**
   * Batch Upload & Validate Sales Orders (NEW and REVISE sheets).
   */
  async uploadSalesOrders(
    input: UploadSalesOrdersInput,
    context: any,
  ): Promise<SalesOrderUploadResult> {
    const { userId, ipAddress, userAgent } = extractContextInfo(context);

    const newRows = input.newOrders ?? [];
    const reviseRows = input.reviseOrders ?? [];
    const totalProcessed = newRows.length + reviseRows.length;

    const failedRows: SalesOrderUploadError[] = [];
    const createdOrders: any[] = [];
    const updatedOrders: any[] = [];

    const itemCache = new Map<string, ResolvedItemContext | null>();
    const customerCache = new Map<number, { id: number; code: string; name: string } | null>();
    const batchExistingOrderNos = new Set<string>();

    // 1. Process NEW Sheet
    for (let i = 0; i < newRows.length; i++) {
      const row = newRows[i];
      const rowNumber = row.rowNumber ?? i + 1;

      const ruleCtx: SalesOrderRuleContext = {
        prisma: this.prisma,
        sheetType: "NEW",
        rowNumber,
        batchExistingOrderNos,
        itemCache,
        customerCache,
      };

      try {
        const transformedRow = await applyTransformRules(row, ruleCtx);
        const violation = await runValidationRules(transformedRow, ruleCtx);

        if (violation) {
          failedRows.push({
            rowNumber,
            sheetName: "NEW",
            orderNo: transformedRow.orderNo ?? null,
            salesOrderNo: transformedRow.salesOrderNo ?? null,
            itemCode: transformedRow.itemCode ?? null,
            field: violation.field ?? null,
            reason: violation.reason,
            actionRequired: violation.actionRequired ?? null,
          });
          continue;
        }

        const resolvedItem = ruleCtx.resolvedItem!;
        const customerCode = resolvedItem.customerCode?.trim().toUpperCase() ?? "GEN";

        // Determine final order number
        let finalOrderNo: string;
        if (CUSTOMERS_WITH_PRESET_ORDER_NO.has(customerCode) && transformedRow.orderNo) {
          finalOrderNo = transformedRow.orderNo.trim();
        } else {
          finalOrderNo = await generateNextOrderNo(customerCode, this.prisma);
        }

        batchExistingOrderNos.add(finalOrderNo);

        const created = await this.prisma.salesOrder.create({
          data: {
            orderNo: finalOrderNo,
            salesOrderNo: transformedRow.salesOrderNo!,
            salesOrderDate: new Date(transformedRow.salesOrderDate!),
            itemCode: transformedRow.itemCode!,
            orderCode: transformedRow.orderCode!,
            orderQty: transformedRow.orderQty!,
            originalQty: transformedRow.orderQty!,
            revisedQty: 0,
            freightType: transformedRow.freightType!,
            requestedETD: new Date(transformedRow.requestedETD!),
            rad: new Date(transformedRow.rad!),
            committedETD: transformedRow.committedETD ? new Date(transformedRow.committedETD) : null,
            remarks: transformedRow.remarks ?? "",
            shippingLotNo: transformedRow.shippingLotNo ?? "",
            prodNo: transformedRow.prodNo!,
            shippingTo: transformedRow.shippingTo ?? "",
            classOrder: transformedRow.classOrder ?? "",
            endUser: transformedRow.endUser ?? "",
            asgdShipment: transformedRow.asgdShipment ?? "",
            status: "Pending",
            productionPlanningStatus: "Locked",
            productionStatus: "Pending",
            shippingStatus: "For-Shipment",
            itemId: resolvedItem.itemId,
            fabricationId: resolvedItem.fabricationId,
            customerId: resolvedItem.customerId,
            createdBy: userId,
            updatedBy: userId,
          },
        });

        createdOrders.push(created);
      } catch (err: any) {
        failedRows.push({
          rowNumber,
          sheetName: "NEW",
          orderNo: row.orderNo ?? null,
          salesOrderNo: row.salesOrderNo ?? null,
          itemCode: row.itemCode ?? null,
          reason: `System processing error: ${err.message}`,
          actionRequired: "Review row data and retry.",
        });
      }
    }

    // 2. Process REVISE Sheet
    for (let i = 0; i < reviseRows.length; i++) {
      const row = reviseRows[i];
      const rowNumber = row.rowNumber ?? i + 1;

      const ruleCtx: SalesOrderRuleContext = {
        prisma: this.prisma,
        sheetType: "REVISE",
        rowNumber,
        batchExistingOrderNos,
        itemCache,
        customerCache,
      };

      try {
        const transformedRow = await applyTransformRules(row, ruleCtx);
        const violation = await runValidationRules(transformedRow, ruleCtx);

        if (violation) {
          failedRows.push({
            rowNumber,
            sheetName: "REVISE",
            orderNo: transformedRow.orderNo ?? null,
            salesOrderNo: transformedRow.salesOrderNo ?? null,
            itemCode: transformedRow.itemCode ?? null,
            field: violation.field ?? null,
            reason: violation.reason,
            actionRequired: violation.actionRequired ?? null,
          });
          continue;
        }

        const existingOrder = ruleCtx.existingDbOrder!;
        const resolvedItem = ruleCtx.resolvedItem;

        const updateData: Prisma.SalesOrderUpdateInput = {
          updatedBy: userId,
        };

        if (transformedRow.salesOrderNo) updateData.salesOrderNo = transformedRow.salesOrderNo;
        if (transformedRow.salesOrderDate) updateData.salesOrderDate = new Date(transformedRow.salesOrderDate);
        if (transformedRow.orderCode) updateData.orderCode = transformedRow.orderCode;
        if (transformedRow.orderQty !== undefined && transformedRow.orderQty !== null) {
          const newQty = Number(transformedRow.orderQty);
          if (Number(existingOrder.orderQty) !== newQty) {
            updateData.orderQty = newQty;
            updateData.revisedQty = newQty;
          }
        }
        if (transformedRow.freightType) updateData.freightType = transformedRow.freightType;
        if (transformedRow.requestedETD) updateData.requestedETD = new Date(transformedRow.requestedETD);
        if (transformedRow.rad) updateData.rad = new Date(transformedRow.rad);
        if (transformedRow.committedETD !== undefined) {
          updateData.committedETD = transformedRow.committedETD ? new Date(transformedRow.committedETD) : null;
        }
        if (transformedRow.remarks !== undefined) updateData.remarks = transformedRow.remarks;
        if (transformedRow.shippingLotNo !== undefined) updateData.shippingLotNo = transformedRow.shippingLotNo;
        if (transformedRow.prodNo) updateData.prodNo = transformedRow.prodNo;
        if (transformedRow.shippingTo !== undefined) updateData.shippingTo = transformedRow.shippingTo;
        if (transformedRow.classOrder !== undefined) updateData.classOrder = transformedRow.classOrder;
        if (transformedRow.endUser !== undefined) updateData.endUser = transformedRow.endUser;
        if (transformedRow.asgdShipment !== undefined) updateData.asgdShipment = transformedRow.asgdShipment;

        if (resolvedItem) {
          updateData.item = { connect: { id: resolvedItem.itemId } };
          if (resolvedItem.fabricationId) {
            updateData.fabrication = { connect: { id: resolvedItem.fabricationId } };
          }
          if (resolvedItem.customerId) {
            updateData.customer = { connect: { id: resolvedItem.customerId } };
          }
        }

        const updated = await this.prisma.salesOrder.update({
          where: { id: existingOrder.id },
          data: updateData,
        });

        updatedOrders.push(updated);
      } catch (err: any) {
        failedRows.push({
          rowNumber,
          sheetName: "REVISE",
          orderNo: row.orderNo ?? null,
          salesOrderNo: row.salesOrderNo ?? null,
          itemCode: row.itemCode ?? null,
          reason: `System processing error: ${err.message}`,
          actionRequired: "Review row data and retry.",
        });
      }
    }

    this.loader.clear();

    if (createdOrders.length > 0 || updatedOrders.length > 0) {
      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        tableName: "SalesOrder",
        recordId: "BATCH",
        action: "BATCH_UPLOAD",
        values: {
          createdCount: createdOrders.length,
          updatedCount: updatedOrders.length,
          failedCount: failedRows.length,
        },
        ipAddress: ipAddress ?? undefined,
        userAgent: userAgent || "Unknown",
      });
    }

    return {
      totalProcessed,
      successCount: createdOrders.length + updatedOrders.length,
      failedCount: failedRows.length,
      createdOrders,
      updatedOrders,
      failedRows,
    };
  }
}
