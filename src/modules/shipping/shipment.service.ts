import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AuditTrailService } from "../../auth/services/audit-trail.service.js";
import { extractContextInfo } from "../../graphql/common/context.helper.js";
import { createError } from "../../graphql/common/error.helper.js";
import { buildPrismaWhere } from "../../graphql/common/filter.helper.js";
import {
  getPrismaPaginationArgs,
  toConnection,
} from "../../graphql/common/pagination.helper.js";
import { BoxContainerLoader } from "../master/box-container/box-container.loader.js";
import { generateFGTransactionNo } from "../inventory/finished-goods-inventory/helpers/finished-goods-inventory.helper.js";
import { PalletContainerLoader } from "./pallet-container.loader.js";
import { ShipmentLoader } from "./shipment.loader.js";
import { ShippingRulesValidator, SHIPPING_RULES } from "./rules/shipping.rules.js";
import { ShippingNumberGenerator } from "./utils/shipping-number.generator.js";
import { ShippingAllocationHelper } from "./helpers/shipping-allocation.helper.js";
import { ShippingWeightHelper } from "./helpers/shipping-weight.helper.js";
import { Prisma } from "../../generated/prisma/client.js";
import type {
  AddBoxesToShipmentInput,
  CreateShipmentInput,
  PaginationInput,
  ShipmentConnection,
  ShipmentFilterInput,
  ShipmentPayload,
  UpdateShipmentInput,
} from "../../generated/graphql/types.js";

@Injectable()
export class ShipmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shipmentLoader: ShipmentLoader,
    private readonly palletContainerLoader: PalletContainerLoader,
    private readonly boxContainerLoader: BoxContainerLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  async findOne(id: number | string, context?: any) {
    extractContextInfo(context);
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    if (Number.isNaN(parsedId)) return null;
    return this.shipmentLoader.byId.load(parsedId);
  }

  async findMany(
    pagination?: PaginationInput | null,
    filter?: ShipmentFilterInput | null,
    context?: any,
  ): Promise<ShipmentConnection> {
    try {
      extractContextInfo(context);
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildPrismaWhere(filter, [
        "shipmentNo",
        "invoiceNo",
        "status",
        "freightType",
        "courier",
        "containerNo",
        "sealNo",
        "portOfDestination",
        "contactPerson",
        "contactNumber",
      ]);

      const [items, totalCount] = await Promise.all([
        this.prisma.shipment.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: [{ shipmentDate: "desc" }, { id: "desc" }],
        }),
        this.prisma.shipment.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as ShipmentConnection;
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
        userErrors: [createError((error as Error).message)],
      } as unknown as ShipmentConnection;
    }
  }

  /**
   * Find eligible BoxContainers (status CLOSED, not yet palletized)
   */
  async findEligibleBoxes(customerId?: number | null, salesOrderIds?: number[] | null, search?: string | null) {
    const where: any = {
      deleted: false,
      palletContainerId: null,
      status: { in: ["CLOSED", "OPEN"] },
    };

    if (customerId) {
      where.salesOrder = { customerId };
    }

    if (salesOrderIds && salesOrderIds.length > 0) {
      where.salesOrderId = { in: salesOrderIds };
    }

    if (search && search.trim() !== "") {
      const s = search.trim();
      where.OR = [
        { boxNo: { contains: s, mode: "insensitive" } },
        { orderNo: { contains: s, mode: "insensitive" } },
      ];
    }

    return this.prisma.boxContainer.findMany({
      where,
      include: {
        items: true,
        boxType: true,
        area: true,
        location: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find eligible SalesOrders with ready packed boxes
   */
  async findEligibleSalesOrders(customerId?: number | null, search?: string | null) {
    const where: any = {
      deleted: false,
      boxContainers: {
        some: {
          palletContainerId: null,
          deleted: false,
        },
      },
    };

    if (customerId) {
      where.customerId = customerId;
    }

    if (search && search.trim() !== "") {
      const s = search.trim();
      where.OR = [
        { orderNo: { contains: s, mode: "insensitive" } },
        { salesOrderNo: { contains: s, mode: "insensitive" } },
        { itemCode: { contains: s, mode: "insensitive" } },
      ];
    }

    return this.prisma.salesOrder.findMany({
      where,
      include: {
        customer: true,
        item: true,
        fabrication: true,
      },
      orderBy: { salesOrderDate: "desc" },
    });
  }

  /**
   * Create Shipment header (and optionally auto-allocate boxes/orders into pallets)
   */
  async create(input: CreateShipmentInput, context?: any): Promise<ShipmentPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const shipmentDate = new Date(input.shipmentDate);
      const year = shipmentDate.getFullYear();

      // Determine daily series and annual series for numbering
      const startOfDay = new Date(shipmentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(shipmentDate);
      endOfDay.setHours(23, 59, 59, 999);

      const startOfYear = new Date(year, 0, 1);
      const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

      const [dailyShipmentsCount, annualShipmentsCount] = await Promise.all([
        this.prisma.shipment.count({
          where: {
            shipmentDate: { gte: startOfDay, lte: endOfDay },
          },
        }),
        this.prisma.shipment.count({
          where: {
            shipmentDate: { gte: startOfYear, lte: endOfYear },
          },
        }),
      ]);

      const dailySeries = dailyShipmentsCount + 1;
      const annualSeries = annualShipmentsCount + 1;

      const shipmentNo = ShippingNumberGenerator.generateShipmentNo({
        date: shipmentDate,
        dailySeries,
      });

      const invoiceNo = ShippingNumberGenerator.generateInvoiceNo({
        year,
        freightType: input.freightType,
        annualSeries,
      });

      const palletTypeId = input.defaultPalletTypeId ?? null;
      let palletTareWeight = 0;
      if (palletTypeId) {
        const pt = await this.prisma.palletType.findUnique({ where: { id: palletTypeId } });
        if (pt) palletTareWeight = Number(pt.weight) || 0;
      }

      // Collect boxes for initial auto-allocation if requested
      let candidateBoxes: any[] = [];
      if (input.boxContainerIds && input.boxContainerIds.length > 0) {
        candidateBoxes = await this.prisma.boxContainer.findMany({
          where: {
            id: { in: input.boxContainerIds },
            palletContainerId: null,
            deleted: false,
          },
        });
      } else if (input.salesOrderIds && input.salesOrderIds.length > 0) {
        candidateBoxes = await this.prisma.boxContainer.findMany({
          where: {
            salesOrderId: { in: input.salesOrderIds },
            palletContainerId: null,
            deleted: false,
          },
        });
      }

      // Execute atomic transaction for creation and allocation
      const result = await this.prisma.$transaction(async (tx) => {
        const shipment = await tx.shipment.create({
          data: {
            shipmentNo,
            invoiceNo,
            shipmentDate,
            freightType: input.freightType,
            courier: input.courier,
            containerNo: input.containerNo ?? null,
            sealNo: input.sealNo ?? null,
            portOfDestination: input.portOfDestination ?? null,
            customerId: input.customerId ?? null,
            contactPerson: input.contactPerson ?? null,
            contactNumber: input.contactNumber ?? null,
            shippingAddress: input.shippingAddress ?? null,
            defaultPalletTypeId: palletTypeId,
            maxPalletLimit: input.maxPalletLimit ?? SHIPPING_RULES.MAX_PALLETS_PER_SHIPMENT,
            status: "PREPARING",
            remarks: input.remarks ?? null,
            createdBy: userId !== "SYSTEM" ? userId : null,
            createdById: userId !== "SYSTEM" ? userId : null,
          },
        });

        // Link SalesOrders if provided
        if (input.salesOrderIds && input.salesOrderIds.length > 0) {
          await tx.salesOrder.updateMany({
            where: { id: { in: input.salesOrderIds } },
            data: {
              shipmentId: shipment.id,
              shippingStatus: "Preparing",
            },
          });
        }

        // If candidate boxes exist, run auto-allocation
        if (candidateBoxes.length > 0) {
          const boxItems = candidateBoxes.map((b) => ({
            id: b.id,
            boxNo: b.boxNo,
            grossWeight: Number(b.grossWeight) || 0,
            netWeight: Number(b.netWeight) || 0,
            totalQty: Number(b.totalQty) || 0,
          }));

          const allocatedPallets = ShippingAllocationHelper.chunkAndAllocateBoxes({
            boxes: boxItems,
            shipmentDate,
            shipmentDailySeries: dailySeries,
            palletTypeId,
            palletTareWeight,
            force: Boolean(input.force),
          });

          for (const ap of allocatedPallets) {
            const createdPallet = await tx.palletContainer.create({
              data: {
                shipmentId: shipment.id,
                palletNo: ap.palletNo,
                sequenceNo: ap.sequenceNo,
                palletTypeId: ap.palletTypeId,
                maxCapacity: ap.maxCapacity,
                tareWeight: ap.tareWeight,
                netWeight: ap.netWeight,
                grossWeight: ap.grossWeight,
                sealStatus: "UNSEALED",
                createdBy: userId !== "SYSTEM" ? userId : null,
                createdById: userId !== "SYSTEM" ? userId : null,
              },
            });

            for (const b of ap.boxes) {
              await tx.boxContainer.update({
                where: { id: b.id },
                data: {
                  palletContainerId: createdPallet.id,
                  sequenceInPallet: b.sequenceInPallet,
                  shippingBoxNo: b.shippingBoxNo,
                },
              });
            }
          }
        }

        return shipment;
      });

      this.shipmentLoader.clear();
      this.palletContainerLoader.clear();
      this.boxContainerLoader.clear();

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "CREATE_SHIPMENT",
        method: "GRAPHQL_MUTATION",
        tableName: "Shipment",
        recordId: String(result.id),
        description: `Created shipment ${result.shipmentNo} (Invoice: ${result.invoiceNo}) with ${candidateBoxes.length} boxes allocated`,
        values: result as any,
        ipAddress,
        userAgent,
      });

      return {
        shipment: result as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        shipment: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * Update shipment header details
   */
  async update(id: number | string, input: UpdateShipmentInput, context?: any): Promise<ShipmentPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;

      const shipment = await this.prisma.shipment.findUnique({
        where: { id: parsedId },
      });

      if (!shipment) {
        return {
          shipment: null,
          userErrors: [createError("Shipment not found")],
        };
      }

      ShippingRulesValidator.validateShipmentEditable(shipment.status);

      const data: Prisma.ShipmentUncheckedUpdateInput = {
        ...(input.shipmentDate ? { shipmentDate: new Date(input.shipmentDate) } : {}),
        ...(input.freightType ? { freightType: input.freightType } : {}),
        ...(input.courier ? { courier: input.courier } : {}),
        ...(input.containerNo !== undefined ? { containerNo: input.containerNo ?? null } : {}),
        ...(input.sealNo !== undefined ? { sealNo: input.sealNo ?? null } : {}),
        ...(input.portOfDestination !== undefined ? { portOfDestination: input.portOfDestination ?? null } : {}),
        ...(input.customerId !== undefined ? { customerId: input.customerId ?? null } : {}),
        ...(input.contactPerson !== undefined ? { contactPerson: input.contactPerson ?? null } : {}),
        ...(input.contactNumber !== undefined ? { contactNumber: input.contactNumber ?? null } : {}),
        ...(input.shippingAddress !== undefined ? { shippingAddress: input.shippingAddress ?? null } : {}),
        ...(input.defaultPalletTypeId !== undefined ? { defaultPalletTypeId: input.defaultPalletTypeId ?? null } : {}),
        ...(input.maxPalletLimit != null ? { maxPalletLimit: input.maxPalletLimit } : {}),
        ...(input.remarks !== undefined ? { remarks: input.remarks ?? null } : {}),
        updatedBy: userId !== "SYSTEM" ? userId : undefined,
        updatedById: userId !== "SYSTEM" ? userId : undefined,
      };

      const updated = await this.prisma.shipment.update({
        where: { id: parsedId },
        data,
      });

      this.shipmentLoader.clear(parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UPDATE_SHIPMENT",
        method: "GRAPHQL_MUTATION",
        tableName: "Shipment",
        recordId: String(parsedId),
        description: `Updated shipment ${shipment.shipmentNo}`,
        values: updated as any,
        ipAddress,
        userAgent,
      });

      return {
        shipment: updated as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        shipment: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * Delete shipment
   */
  async delete(id: number | string, context?: any): Promise<ShipmentPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;

      const shipment = await this.prisma.shipment.findUnique({
        where: { id: parsedId },
        include: {
          pallets: {
            include: { boxContainers: true },
          },
        },
      });

      if (!shipment) {
        return {
          shipment: null,
          userErrors: [createError("Shipment not found")],
        };
      }

      ShippingRulesValidator.validateShipmentEditable(shipment.status);

      await this.prisma.$transaction(async (tx) => {
        // Unlink all boxes
        for (const pallet of shipment.pallets) {
          for (const box of pallet.boxContainers) {
            await tx.boxContainer.update({
              where: { id: box.id },
              data: {
                palletContainerId: null,
                sequenceInPallet: null,
                shippingBoxNo: null,
              },
            });
          }
          await tx.palletContainer.delete({ where: { id: pallet.id } });
        }

        // Unlink sales orders
        await tx.salesOrder.updateMany({
          where: { shipmentId: parsedId },
          data: {
            shipmentId: null,
            shippingStatus: "For-Shipment",
          },
        });

        // Delete shipment
        await tx.shipment.delete({
          where: { id: parsedId },
        });
      });

      this.shipmentLoader.clear(parsedId);
      this.palletContainerLoader.clear();
      this.boxContainerLoader.clear();

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "DELETE_SHIPMENT",
        method: "GRAPHQL_MUTATION",
        tableName: "Shipment",
        recordId: String(parsedId),
        description: `Deleted shipment ${shipment.shipmentNo}`,
        ipAddress,
        userAgent,
      });

      return {
        shipment: shipment as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        shipment: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * Add more boxes to an existing shipment (fill unsealed pallets or allocate into new pallets)
   */
  async addBoxes(input: AddBoxesToShipmentInput, context?: any): Promise<ShipmentPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const shipmentId = typeof input.shipmentId === "string" ? parseInt(input.shipmentId, 10) : input.shipmentId;

      const shipment = await this.prisma.shipment.findUnique({
        where: { id: shipmentId },
        include: {
          pallets: {
            where: { deleted: false },
            include: {
              boxContainers: { where: { deleted: false }, orderBy: { sequenceInPallet: "asc" } },
            },
            orderBy: { sequenceNo: "asc" },
          },
        },
      });

      if (!shipment) {
        return {
          shipment: null,
          userErrors: [createError("Shipment not found")],
        };
      }

      ShippingRulesValidator.validateShipmentEditable(shipment.status);

      // Collect boxes
      let candidateBoxes: any[] = [];
      if (input.boxContainerIds && input.boxContainerIds.length > 0) {
        candidateBoxes = await this.prisma.boxContainer.findMany({
          where: {
            id: { in: input.boxContainerIds },
            palletContainerId: null,
            deleted: false,
          },
        });
      } else if (input.salesOrderIds && input.salesOrderIds.length > 0) {
        candidateBoxes = await this.prisma.boxContainer.findMany({
          where: {
            salesOrderId: { in: input.salesOrderIds },
            palletContainerId: null,
            deleted: false,
          },
        });
      }

      if (candidateBoxes.length === 0) {
        return {
          shipment: null,
          userErrors: [createError("No eligible unassigned boxes found for the selected IDs")],
        };
      }

      // If target pallet container specified
      if (input.targetPalletContainerId) {
        const targetPalletId =
          typeof input.targetPalletContainerId === "string"
            ? parseInt(input.targetPalletContainerId, 10)
            : input.targetPalletContainerId;

        const targetPallet = shipment.pallets.find((p) => p.id === targetPalletId);
        if (!targetPallet) {
          return {
            shipment: null,
            userErrors: [createError("Target pallet container not found in this shipment")],
          };
        }

        ShippingRulesValidator.validatePalletUnsealed(targetPallet.sealStatus);
        ShippingRulesValidator.validatePalletBoxLimit(
          targetPallet.boxContainers.length,
          candidateBoxes.length,
          targetPallet.maxCapacity,
          Boolean(input.force),
        );

        await this.prisma.$transaction(async (tx) => {
          let seq = targetPallet.boxContainers.length + 1;
          for (const box of candidateBoxes) {
            await tx.boxContainer.update({
              where: { id: box.id },
              data: {
                palletContainerId: targetPalletId,
                sequenceInPallet: seq++,
              },
            });
          }

          // Link associated sales orders if needed
          const soIds = Array.from(new Set(candidateBoxes.map((b) => b.salesOrderId).filter(Boolean)));
          if (soIds.length > 0) {
            await tx.salesOrder.updateMany({
              where: { id: { in: soIds as number[] } },
              data: { shipmentId, shippingStatus: "Preparing" },
            });
          }

          await ShippingWeightHelper.recalculatePalletWeight(tx, targetPalletId);
        });
      } else {
        // Auto-fit into existing UNSEALED pallets with capacity, then create new pallets for remainder
        const unsealedPallets = shipment.pallets.filter((p) => p.sealStatus === "UNSEALED");
        const remainingBoxes = [...candidateBoxes];

        await this.prisma.$transaction(async (tx) => {
          // Fill existing unsealed pallets
          for (const p of unsealedPallets) {
            const availableSlots = p.maxCapacity - p.boxContainers.length;
            if (availableSlots > 0 && remainingBoxes.length > 0) {
              const boxesToFit = remainingBoxes.splice(0, availableSlots);
              let seq = p.boxContainers.length + 1;

              for (const box of boxesToFit) {
                await tx.boxContainer.update({
                  where: { id: box.id },
                  data: {
                    palletContainerId: p.id,
                    sequenceInPallet: seq++,
                  },
                });
              }

              await ShippingWeightHelper.recalculatePalletWeight(tx, p.id);
            }
          }

          // Create new pallets for remaining boxes
          if (remainingBoxes.length > 0) {
            const newPalletTypeId = input.palletTypeId ?? shipment.defaultPalletTypeId;
            let ptTareWeight = 0;
            if (newPalletTypeId) {
              const pt = await tx.palletType.findUnique({ where: { id: newPalletTypeId } });
              if (pt) ptTareWeight = Number(pt.weight) || 0;
            }

            const currentTotalPallets = shipment.pallets.length;
            const startSeq = currentTotalPallets + 1;

            const boxItems = remainingBoxes.map((b) => ({
              id: b.id,
              boxNo: b.boxNo,
              grossWeight: Number(b.grossWeight) || 0,
              netWeight: Number(b.netWeight) || 0,
              totalQty: Number(b.totalQty) || 0,
            }));

            const allocatedPallets = ShippingAllocationHelper.chunkAndAllocateBoxes({
              boxes: boxItems,
              shipmentDate: shipment.shipmentDate,
              shipmentDailySeries: 1,
              palletTypeId: newPalletTypeId,
              palletTareWeight: ptTareWeight,
              startPalletSequence: startSeq,
              force: Boolean(input.force),
            });

            // Validate total pallets
            ShippingRulesValidator.validateShipmentPalletLimit(
              currentTotalPallets,
              allocatedPallets.length,
              shipment.maxPalletLimit,
              Boolean(input.force),
            );

            for (const ap of allocatedPallets) {
              const createdPallet = await tx.palletContainer.create({
                data: {
                  shipmentId: shipment.id,
                  palletNo: ap.palletNo,
                  sequenceNo: ap.sequenceNo,
                  palletTypeId: ap.palletTypeId,
                  maxCapacity: ap.maxCapacity,
                  tareWeight: ap.tareWeight,
                  netWeight: ap.netWeight,
                  grossWeight: ap.grossWeight,
                  sealStatus: "UNSEALED",
                  createdBy: userId !== "SYSTEM" ? userId : null,
                  createdById: userId !== "SYSTEM" ? userId : null,
                },
              });

              for (const b of ap.boxes) {
                await tx.boxContainer.update({
                  where: { id: b.id },
                  data: {
                    palletContainerId: createdPallet.id,
                    sequenceInPallet: b.sequenceInPallet,
                    shippingBoxNo: b.shippingBoxNo,
                  },
                });
              }
            }
          }

          // Link SalesOrders
          const soIds = Array.from(new Set(candidateBoxes.map((b) => b.salesOrderId).filter(Boolean)));
          if (soIds.length > 0) {
            await tx.salesOrder.updateMany({
              where: { id: { in: soIds as number[] } },
              data: { shipmentId, shippingStatus: "Preparing" },
            });
          }
        });
      }

      this.shipmentLoader.clear(shipmentId);
      this.palletContainerLoader.clear();
      this.boxContainerLoader.clear();

      const updated = await this.prisma.shipment.findUnique({
        where: { id: shipmentId },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "ADD_BOXES_TO_SHIPMENT",
        method: "GRAPHQL_MUTATION",
        tableName: "Shipment",
        recordId: String(shipmentId),
        description: `Added ${candidateBoxes.length} boxes to shipment ${shipment.shipmentNo}`,
        ipAddress,
        userAgent,
      });

      return {
        shipment: updated as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        shipment: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * Reallocate and evenly re-chunk boxes across pallets in the shipment
   */
  async reallocate(shipmentId: number | string, palletTypeId?: number | null, force = false, context?: any): Promise<ShipmentPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof shipmentId === "string" ? parseInt(shipmentId, 10) : shipmentId;

      const shipment = await this.prisma.shipment.findUnique({
        where: { id: parsedId },
        include: {
          pallets: {
            where: { deleted: false },
            include: { boxContainers: { where: { deleted: false } } },
          },
        },
      });

      if (!shipment) {
        return {
          shipment: null,
          userErrors: [createError("Shipment not found")],
        };
      }

      ShippingRulesValidator.validateShipmentEditable(shipment.status);

      // Verify all pallets are unsealed
      for (const p of shipment.pallets) {
        ShippingRulesValidator.validatePalletUnsealed(p.sealStatus);
      }

      const allBoxes = shipment.pallets.flatMap((p) => p.boxContainers);
      if (allBoxes.length === 0) {
        return {
          shipment: null,
          userErrors: [createError("No boxes in shipment to reallocate")],
        };
      }

      const targetPalletTypeId = palletTypeId ?? shipment.defaultPalletTypeId;
      let palletTareWeight = 0;
      if (targetPalletTypeId) {
        const pt = await this.prisma.palletType.findUnique({ where: { id: targetPalletTypeId } });
        if (pt) palletTareWeight = Number(pt.weight) || 0;
      }

      const boxItems = allBoxes.map((b) => ({
        id: b.id,
        boxNo: b.boxNo,
        grossWeight: Number(b.grossWeight) || 0,
        netWeight: Number(b.netWeight) || 0,
        totalQty: Number(b.totalQty) || 0,
      }));

      const allocatedPallets = ShippingAllocationHelper.chunkAndAllocateBoxes({
        boxes: boxItems,
        shipmentDate: shipment.shipmentDate,
        shipmentDailySeries: 1,
        palletTypeId: targetPalletTypeId,
        palletTareWeight,
        force,
      });

      ShippingRulesValidator.validateShipmentPalletLimit(
        0,
        allocatedPallets.length,
        shipment.maxPalletLimit,
        force,
      );

      await this.prisma.$transaction(async (tx) => {
        // Unlink boxes first
        for (const box of allBoxes) {
          await tx.boxContainer.update({
            where: { id: box.id },
            data: { palletContainerId: null, sequenceInPallet: null, shippingBoxNo: null },
          });
        }

        // Delete old pallets
        for (const p of shipment.pallets) {
          await tx.palletContainer.delete({ where: { id: p.id } });
        }

        // Create new pallets and assign boxes
        for (const ap of allocatedPallets) {
          const createdPallet = await tx.palletContainer.create({
            data: {
              shipmentId: shipment.id,
              palletNo: ap.palletNo,
              sequenceNo: ap.sequenceNo,
              palletTypeId: ap.palletTypeId,
              maxCapacity: ap.maxCapacity,
              tareWeight: ap.tareWeight,
              netWeight: ap.netWeight,
              grossWeight: ap.grossWeight,
              sealStatus: "UNSEALED",
              createdBy: userId !== "SYSTEM" ? userId : null,
              createdById: userId !== "SYSTEM" ? userId : null,
            },
          });

          for (const b of ap.boxes) {
            await tx.boxContainer.update({
              where: { id: b.id },
              data: {
                palletContainerId: createdPallet.id,
                sequenceInPallet: b.sequenceInPallet,
                shippingBoxNo: b.shippingBoxNo,
              },
            });
          }
        }
      });

      this.shipmentLoader.clear(parsedId);
      this.palletContainerLoader.clear();
      this.boxContainerLoader.clear();

      const updated = await this.prisma.shipment.findUnique({
        where: { id: parsedId },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "REALLOCATE_SHIPMENT_BOXES",
        method: "GRAPHQL_MUTATION",
        tableName: "Shipment",
        recordId: String(parsedId),
        description: `Reallocated ${allBoxes.length} boxes into ${allocatedPallets.length} pallets`,
        ipAddress,
        userAgent,
      });

      return {
        shipment: updated as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        shipment: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * Finalize shipment (Requires 100% of pallets to be SEALED)
   */
  async finalize(id: number | string, context?: any): Promise<ShipmentPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;

      const shipment = await this.prisma.shipment.findUnique({
        where: { id: parsedId },
        include: {
          pallets: {
            where: { deleted: false },
          },
        },
      });

      if (!shipment) {
        return {
          shipment: null,
          userErrors: [createError("Shipment not found")],
        };
      }

      if (shipment.status !== "PREPARING") {
        return {
          shipment: null,
          userErrors: [createError(`Cannot finalize shipment in ${shipment.status} status`)],
        };
      }

      if (shipment.pallets.length === 0) {
        return {
          shipment: null,
          userErrors: [createError("Shipment must contain at least 1 pallet to finalize")],
        };
      }

      const unsealedPallets = shipment.pallets.filter((p) => p.sealStatus !== "SEALED");
      if (unsealedPallets.length > 0) {
        return {
          shipment: null,
          userErrors: [
            createError(
              `Cannot finalize shipment. ${unsealedPallets.length} pallet(s) are still UNSEALED. All pallets must be sealed before finalizing.`,
            ),
          ],
        };
      }

      const updated = await this.prisma.shipment.update({
        where: { id: parsedId },
        data: {
          status: "FINALIZED",
          finalizedAt: new Date(),
          finalizedById: userId !== "SYSTEM" ? userId : null,
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
          updatedById: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.shipmentLoader.clear(parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "FINALIZE_SHIPMENT",
        method: "GRAPHQL_MUTATION",
        tableName: "Shipment",
        recordId: String(parsedId),
        description: `Finalized shipment ${shipment.shipmentNo}`,
        values: updated as any,
        ipAddress,
        userAgent,
      });

      return {
        shipment: updated as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        shipment: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * Undo Finalization (Revert from FINALIZED to PREPARING)
   */
  async undoFinalize(id: number | string, context?: any): Promise<ShipmentPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;

      const shipment = await this.prisma.shipment.findUnique({
        where: { id: parsedId },
      });

      if (!shipment) {
        return {
          shipment: null,
          userErrors: [createError("Shipment not found")],
        };
      }

      if (shipment.status !== "FINALIZED") {
        return {
          shipment: null,
          userErrors: [createError(`Cannot undo finalize for shipment in ${shipment.status} status`)],
        };
      }

      const updated = await this.prisma.shipment.update({
        where: { id: parsedId },
        data: {
          status: "PREPARING",
          finalizedAt: null,
          finalizedById: null,
          updatedBy: userId !== "SYSTEM" ? userId : undefined,
          updatedById: userId !== "SYSTEM" ? userId : undefined,
        },
      });

      this.shipmentLoader.clear(parsedId);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "UNDO_FINALIZE_SHIPMENT",
        method: "GRAPHQL_MUTATION",
        tableName: "Shipment",
        recordId: String(parsedId),
        description: `Reverted shipment ${shipment.shipmentNo} back to PREPARING`,
        values: updated as any,
        ipAddress,
        userAgent,
      });

      return {
        shipment: updated as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        shipment: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  /**
   * Ship Out (Deduct Finished Goods inventory & update SalesOrders)
   */
  async shipOut(id: number | string, context?: any): Promise<ShipmentPayload> {
    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const parsedId = typeof id === "string" ? parseInt(id, 10) : id;

      const shipment = await this.prisma.shipment.findUnique({
        where: { id: parsedId },
        include: {
          pallets: {
            where: { deleted: false },
            include: {
              boxContainers: {
                where: { deleted: false },
                include: {
                  items: { where: { deleted: false } },
                },
              },
            },
          },
          salesOrders: true,
        },
      });

      if (!shipment) {
        return {
          shipment: null,
          userErrors: [createError("Shipment not found")],
        };
      }

      if (shipment.status !== "FINALIZED") {
        return {
          shipment: null,
          userErrors: [createError(`Shipment must be FINALIZED before shipping out. Current status: ${shipment.status}`)],
        };
      }

      await this.prisma.$transaction(async (tx) => {
        // 1. Mark Shipment as SHIPPED
        await tx.shipment.update({
          where: { id: parsedId },
          data: {
            status: "SHIPPED",
            shippedAt: new Date(),
            shippedById: userId !== "SYSTEM" ? userId : null,
            updatedBy: userId !== "SYSTEM" ? userId : undefined,
            updatedById: userId !== "SYSTEM" ? userId : undefined,
          },
        });

        // 2. Map shipped quantities per SalesOrder
        const salesOrderShippedMap = new Map<number, number>();

        // 3. For each box container and item, deduct inventory
        for (const pallet of shipment.pallets) {
          for (const box of pallet.boxContainers) {
            await tx.boxContainer.update({
              where: { id: box.id },
              data: { status: "SHIPPED" },
            });

            for (const item of box.items) {
              const qty = Number(item.quantity) || 0;
              const soId = item.salesOrderId;
              salesOrderShippedMap.set(soId, (salesOrderShippedMap.get(soId) || 0) + qty);

              // Find matching FinishedGoodsLot
              if (item.fabricationId) {
                const matchingLot = await tx.finishedGoodsLot.findFirst({
                  where: {
                    itemId: item.itemId,
                    fabricationId: item.fabricationId,
                    orderNo: item.orderNo,
                    lotNo: item.lotNo,
                    deleted: false,
                  },
                });

                if (matchingLot) {
                  const currentAllocated = Number(matchingLot.allocatedQty) || 0;
                  const currentAvailable = Number(matchingLot.availableQty) || 0;

                  let newAllocated = currentAllocated;
                  let newAvailable = currentAvailable;

                  if (currentAllocated >= qty) {
                    newAllocated -= qty;
                  } else {
                    const diff = qty - currentAllocated;
                    newAllocated = 0;
                    newAvailable = Math.max(0, currentAvailable - diff);
                  }

                  const balanceAfter = newAvailable + newAllocated + Number(matchingLot.checkingQty) + Number(matchingLot.defectiveQty);

                  await tx.finishedGoodsLot.update({
                    where: { id: matchingLot.id },
                    data: {
                      allocatedQty: newAllocated,
                      availableQty: newAvailable,
                    },
                  });

                  const txNo = generateFGTransactionNo("SHIP");
                  await tx.finishedGoodsTransaction.create({
                    data: {
                      transactionNo: txNo,
                      transactionType: "SHIPMENT",
                      direction: "OUTBOUND",
                      itemId: item.itemId,
                      fabricationId: item.fabricationId,
                      finishedGoodsLotId: matchingLot.id,
                      orderNo: item.orderNo,
                      lotNo: item.lotNo,
                      chargeNo: item.chargeNo || "",
                      fromAreaId: matchingLot.areaId,
                      fromLocationId: matchingLot.locationId,
                      fromBoxId: matchingLot.boxId,
                      fromStatus: currentAllocated >= qty ? "ALLOCATED" : "AVAILABLE",
                      toStatus: "SHIPPED",
                      quantity: qty,
                      balanceAfter,
                      referenceNo: shipment.invoiceNo,
                      invoiceNo: shipment.invoiceNo,
                      createdBy: userId !== "SYSTEM" ? userId : null,
                    },
                  });
                }
              }
            }
          }
        }

        // 4. Update SalesOrders shipped quantity and status
        for (const [soId, addedQty] of salesOrderShippedMap.entries()) {
          const so = await tx.salesOrder.findUnique({ where: { id: soId } });
          if (so) {
            const currentShipped = Number(so.shippedQty) || 0;
            const newShipped = currentShipped + addedQty;
            const orderQty = Number(so.orderQty) || 0;

            const isComplete = newShipped >= orderQty;
            await tx.salesOrder.update({
              where: { id: soId },
              data: {
                shippedQty: newShipped,
                shippingStatus: "Shipped",
                status: isComplete ? "Completed" : so.status,
              },
            });
          }
        }
      });

      this.shipmentLoader.clear(parsedId);
      this.palletContainerLoader.clear();
      this.boxContainerLoader.clear();

      const updated = await this.prisma.shipment.findUnique({
        where: { id: parsedId },
      });

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "SHIP_OUT",
        method: "GRAPHQL_MUTATION",
        tableName: "Shipment",
        recordId: String(parsedId),
        description: `Dispatched shipment ${shipment.shipmentNo} (Invoice: ${shipment.invoiceNo})`,
        values: updated as any,
        ipAddress,
        userAgent,
      });

      return {
        shipment: updated as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        shipment: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
