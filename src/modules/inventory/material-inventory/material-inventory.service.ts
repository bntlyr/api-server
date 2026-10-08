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
  ChangeMaterialLotStatusInput,
  DiscardMaterialInventoryInput,
  ManualInMaterialInput,
  ManualOutMaterialInput,
  MaterialInventoryLotConnection,
  MaterialInventoryLotFilterInput,
  MaterialInventoryOperationPayload,
  MaterialInventorySummary,
  MaterialInventorySummaryConnection,
  MaterialInventorySummaryFilterInput,
  MaterialInventoryTransactionConnection,
  MaterialInventoryTransactionFilterInput,
  PaginationInput,
  TransferMaterialLocationInput,
} from "../../../generated/graphql/types.js";
import {
  buildLotWhereClause,
  buildSummaryWhereClause,
  buildTransactionWhereClause,
  generateTransactionNo,
  validateChangeStatusInput,
  validateDiscardInput,
  validateManualInInput,
  validateManualOutInput,
  validateTransferLocationInput,
} from "./helpers/material-inventory.helper.js";
import { MaterialInventoryLoader } from "./material-inventory.loader.js";
import { Prisma } from "../../../generated/prisma/client.js";

@Injectable()
export class MaterialInventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly loader: MaterialInventoryLoader,
    private readonly auditService: AuditTrailService,
  ) {}

  // ----------------------------------------------------
  // QUERIES: Lots
  // ----------------------------------------------------
  async findLotById(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    if (Number.isNaN(parsedId)) return null;
    return this.loader.lotById.load(parsedId);
  }

  async findLots(
    pagination?: PaginationInput | null,
    filter?: MaterialInventoryLotFilterInput | null,
  ): Promise<MaterialInventoryLotConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildLotWhereClause(filter);

      const [items, totalCount] = await Promise.all([
        this.prisma.materialInventoryLot.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
        this.prisma.materialInventoryLot.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as MaterialInventoryLotConnection;
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
      } as unknown as MaterialInventoryLotConnection;
    }
  }

  async findLotsByMaterialId(
    materialId: number | string,
    pagination?: PaginationInput | null,
    filter?: MaterialInventoryLotFilterInput | null,
  ): Promise<MaterialInventoryLotConnection> {
    const parsedMaterialId = typeof materialId === "string" ? parseInt(materialId, 10) : materialId;
    if (Number.isNaN(parsedMaterialId)) {
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
        userErrors: [createError("Invalid Material ID", "materialId", "INVALID_INPUT")],
      } as unknown as MaterialInventoryLotConnection;
    }

    const mergedFilter: MaterialInventoryLotFilterInput = {
      ...filter,
      materialId: { equals: parsedMaterialId },
    };

    return this.findLots(pagination, mergedFilter);
  }

  // ----------------------------------------------------
  // QUERIES: Transactions
  // ----------------------------------------------------
  async findTransactionById(id: number | string) {
    const parsedId = typeof id === "string" ? parseInt(id, 10) : id;
    if (Number.isNaN(parsedId)) return null;
    return this.loader.transactionById.load(parsedId);
  }

  async findTransactions(
    pagination?: PaginationInput | null,
    filter?: MaterialInventoryTransactionFilterInput | null,
  ): Promise<MaterialInventoryTransactionConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildTransactionWhereClause(filter);

      const [items, totalCount] = await Promise.all([
        this.prisma.materialInventoryTransaction.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
        }),
        this.prisma.materialInventoryTransaction.count({ where }),
      ]);

      const connection = toConnection(items, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as MaterialInventoryTransactionConnection;
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
      } as unknown as MaterialInventoryTransactionConnection;
    }
  }

  // ----------------------------------------------------
  // QUERIES: Summary / Aggregation
  // ----------------------------------------------------
  async findSummaryByMaterialId(materialId: number | string): Promise<MaterialInventorySummary | null> {
    const parsedMaterialId = typeof materialId === "string" ? parseInt(materialId, 10) : materialId;
    if (Number.isNaN(parsedMaterialId)) return null;

    const material = await this.prisma.material.findUnique({
      where: { id: parsedMaterialId },
    });
    if (!material) return null;

    const lots = await this.prisma.materialInventoryLot.findMany({
      where: { materialId: parsedMaterialId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    let totalAvailableQty = 0;
    let totalAllocatedQty = 0;
    let totalPendingQty = 0;
    let totalDefectiveQty = 0;

    for (const lot of lots) {
      totalAvailableQty += Number(lot.availableQty);
      totalAllocatedQty += Number(lot.allocatedQty);
      totalPendingQty += Number(lot.pendingQty);
      totalDefectiveQty += Number(lot.defectiveQty);
    }

    const totalOnHandQty = totalAvailableQty + totalAllocatedQty + totalPendingQty + totalDefectiveQty;

    return {
      id: String(material.id),
      materialId: material.id,
      material: material as any,
      totalAvailableQty,
      totalAllocatedQty,
      totalPendingQty,
      totalDefectiveQty,
      totalOnHandQty,
      lotCount: lots.length,
      lots: lots as any,
    };
  }

  async findSummaries(
    pagination?: PaginationInput | null,
    filter?: MaterialInventorySummaryFilterInput | null,
  ): Promise<MaterialInventorySummaryConnection> {
    try {
      const { take, skip, cursor, limit } = getPrismaPaginationArgs(pagination, {
        isNumericId: true,
      });

      const where = buildSummaryWhereClause(filter);

      const [materials, totalCount] = await Promise.all([
        this.prisma.material.findMany({
          where,
          take,
          skip,
          cursor,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          include: {
            inventoryLots: true,
          },
        }),
        this.prisma.material.count({ where }),
      ]);

      const summaries: MaterialInventorySummary[] = materials.map((material) => {
        let totalAvailableQty = 0;
        let totalAllocatedQty = 0;
        let totalPendingQty = 0;
        let totalDefectiveQty = 0;

        for (const lot of material.inventoryLots) {
          totalAvailableQty += Number(lot.availableQty);
          totalAllocatedQty += Number(lot.allocatedQty);
          totalPendingQty += Number(lot.pendingQty);
          totalDefectiveQty += Number(lot.defectiveQty);
        }

        const totalOnHandQty = totalAvailableQty + totalAllocatedQty + totalPendingQty + totalDefectiveQty;

        return {
          id: String(material.id),
          materialId: material.id,
          material: material as any,
          totalAvailableQty,
          totalAllocatedQty,
          totalPendingQty,
          totalDefectiveQty,
          totalOnHandQty,
          lotCount: material.inventoryLots.length,
          lots: material.inventoryLots as any,
        };
      });

      const connection = toConnection(summaries, limit, totalCount, Boolean(pagination?.after));

      return {
        ...connection,
        userErrors: [],
      } as unknown as MaterialInventorySummaryConnection;
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
      } as unknown as MaterialInventorySummaryConnection;
    }
  }

  // ----------------------------------------------------
  // MUTATION: 1. Manual-In
  // ----------------------------------------------------
  async manualIn(
    input: ManualInMaterialInput,
    context?: any,
  ): Promise<MaterialInventoryOperationPayload> {
    const validationError = validateManualInInput(input);
    if (validationError) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const qty = new Prisma.Decimal(input.quantity);
      const qtyField =
        input.status === "AVAILABLE"
          ? "availableQty"
          : input.status === "PENDING"
            ? "pendingQty"
            : "defectiveQty";

      const txNo = generateTransactionNo("MIN");

      const result = await this.prisma.$transaction(async (tx) => {
        let lot;
        if (input.materialInventoryLotId && input.materialInventoryLotId > 0) {
          const existingLot = await tx.materialInventoryLot.findUnique({
            where: { id: input.materialInventoryLotId },
          });
          if (!existingLot) {
            throw new Error(`Material Inventory Lot with ID ${input.materialInventoryLotId} not found`);
          }
          lot = await tx.materialInventoryLot.update({
            where: { id: existingLot.id },
            data: {
              [qtyField]: { increment: qty },
              ...(input.purchaseOrderNo ? { purchaseOrderNo: input.purchaseOrderNo.trim() } : {}),
              ...(input.invoiceNo ? { invoiceNo: input.invoiceNo.trim() } : {}),
              ...(input.supplierId ? { supplierId: input.supplierId } : {}),
              ...(input.incomingDate ? { incomingDate: new Date(input.incomingDate) } : {}),
              ...(input.manufactureDate ? { manufactureDate: new Date(input.manufactureDate) } : {}),
              ...(input.expirationDate ? { expirationDate: new Date(input.expirationDate) } : {}),
              ...(input.qcSampling ? { qcSampling: input.qcSampling.trim() } : {}),
              reason: input.reason.trim(),
              updatedBy: userId !== "SYSTEM" ? userId : null,
            },
          });
        } else {
          lot = await tx.materialInventoryLot.upsert({
            where: {
              materialId_lotNo_receivingReportNo_areaId_locationId: {
                materialId: input.materialId!,
                lotNo: input.lotNo!.trim(),
                receivingReportNo: input.receivingReportNo?.trim() ?? "",
                areaId: input.areaId!,
                locationId: input.locationId!,
              },
            },
            update: {
              [qtyField]: { increment: qty },
              ...(input.purchaseOrderNo ? { purchaseOrderNo: input.purchaseOrderNo.trim() } : {}),
              ...(input.invoiceNo ? { invoiceNo: input.invoiceNo.trim() } : {}),
              ...(input.supplierId ? { supplierId: input.supplierId } : {}),
              ...(input.incomingDate ? { incomingDate: new Date(input.incomingDate) } : {}),
              ...(input.manufactureDate ? { manufactureDate: new Date(input.manufactureDate) } : {}),
              ...(input.expirationDate ? { expirationDate: new Date(input.expirationDate) } : {}),
              ...(input.qcSampling ? { qcSampling: input.qcSampling.trim() } : {}),
              reason: input.reason.trim(),
              updatedBy: userId !== "SYSTEM" ? userId : null,
            },
            create: {
              materialId: input.materialId!,
              lotNo: input.lotNo!.trim(),
              areaId: input.areaId!,
              locationId: input.locationId!,
              [qtyField]: qty,
              receivingReportNo: input.receivingReportNo?.trim() ?? "",
              purchaseOrderNo: input.purchaseOrderNo?.trim() ?? null,
              invoiceNo: input.invoiceNo?.trim() ?? null,
              supplierId: input.supplierId ?? null,
              incomingDate: input.incomingDate ? new Date(input.incomingDate) : null,
              manufactureDate: input.manufactureDate ? new Date(input.manufactureDate) : null,
              expirationDate: input.expirationDate ? new Date(input.expirationDate) : null,
              qcSampling: input.qcSampling?.trim() ?? null,
              reason: input.reason.trim(),
              createdBy: userId !== "SYSTEM" ? userId : null,
            },
          });
        }

        const transaction = await tx.materialInventoryTransaction.create({
          data: {
            transactionNo: txNo,
            transactionType: "MANUAL_IN",
            direction: "INBOUND",
            transactionDate: new Date(),
            materialId: lot.materialId,
            materialInventoryLotId: lot.id,
            lotNo: lot.lotNo,
            toAreaId: lot.areaId,
            toLocationId: lot.locationId,
            toStatus: input.status,
            quantity: qty,
            balanceAfter: Number(lot[qtyField]),
            reason: input.reason.trim(),
            remarks: input.remarks?.trim() ?? null,
            referenceNo:
              lot.receivingReportNo ||
              lot.purchaseOrderNo ||
              lot.invoiceNo ||
              null,
            createdBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        return { lot, transaction };
      });

      this.loader.clear(result.lot.id);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "MATERIAL_INVENTORY_MANUAL_IN",
        method: "GRAPHQL_MUTATION",
        tableName: "MaterialInventoryLot",
        recordId: String(result.lot.id),
        description: `Manual In ${input.quantity} of Lot ${result.lot.lotNo} as ${input.status}`,
        values: result as any,
        ipAddress,
        userAgent,
      });

      return {
        lot: result.lot as any,
        destinationLot: null,
        transaction: result.transaction as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  // ----------------------------------------------------
  // MUTATION: 1b. Manual-Out (Deducts strictly from AVAILABLE)
  // ----------------------------------------------------
  async manualOut(
    input: ManualOutMaterialInput,
    context?: any,
  ): Promise<MaterialInventoryOperationPayload> {
    const validationError = validateManualOutInput(input);
    if (validationError) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const qty = new Prisma.Decimal(input.quantity);
      const txNo = generateTransactionNo("MOUT");

      const result = await this.prisma.$transaction(async (tx) => {
        const currentLot = await tx.materialInventoryLot.findUnique({
          where: { id: input.materialInventoryLotId },
        });

        if (!currentLot) {
          throw new Error(`Material Inventory Lot with ID ${input.materialInventoryLotId} not found`);
        }

        const availableQty = new Prisma.Decimal(currentLot.availableQty);
        if (availableQty.lessThan(qty)) {
          throw new Error(
            `Insufficient AVAILABLE quantity for manual out. Requested: ${input.quantity}, Available: ${availableQty.toString()}`,
          );
        }

        const updatedLot = await tx.materialInventoryLot.update({
          where: { id: input.materialInventoryLotId },
          data: {
            availableQty: { decrement: qty },
            reason: input.reason.trim(),
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        const transaction = await tx.materialInventoryTransaction.create({
          data: {
            transactionNo: txNo,
            transactionType: "MANUAL_OUT",
            direction: "OUTBOUND",
            transactionDate: new Date(),
            materialId: updatedLot.materialId,
            materialInventoryLotId: updatedLot.id,
            lotNo: updatedLot.lotNo,
            fromAreaId: updatedLot.areaId,
            fromLocationId: updatedLot.locationId,
            fromStatus: "AVAILABLE",
            quantity: qty,
            balanceAfter: Number(updatedLot.availableQty),
            reason: input.reason.trim(),
            remarks: input.remarks?.trim() ?? null,
            referenceNo: input.referenceNo?.trim() ?? updatedLot.receivingReportNo ?? null,
            createdBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        return { lot: updatedLot, transaction };
      });

      this.loader.clear(result.lot.id);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "MATERIAL_INVENTORY_MANUAL_OUT",
        method: "GRAPHQL_MUTATION",
        tableName: "MaterialInventoryLot",
        recordId: String(result.lot.id),
        description: `Manual Out ${input.quantity} from Lot ${result.lot.lotNo}`,
        values: result as any,
        ipAddress,
        userAgent,
      });

      return {
        lot: result.lot as any,
        destinationLot: null,
        transaction: result.transaction as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  // ----------------------------------------------------
  // MUTATION: 2. Transfer Location
  // ----------------------------------------------------
  async transferLocation(
    input: TransferMaterialLocationInput,
    context?: any,
  ): Promise<MaterialInventoryOperationPayload> {
    const validationError = validateTransferLocationInput(input);
    if (validationError) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const qty = new Prisma.Decimal(input.quantity);
      const statusField =
        input.status === "PENDING"
          ? "pendingQty"
          : input.status === "DEFECTIVE"
            ? "defectiveQty"
            : input.status === "ALLOCATED"
              ? "allocatedQty"
              : "availableQty";
      const statusName = input.status ?? "AVAILABLE";

      const sourceLot = await this.prisma.materialInventoryLot.findUnique({
        where: { id: input.materialInventoryLotId },
      });

      if (!sourceLot) {
        return {
          lot: null,
          destinationLot: null,
          transaction: null,
          userErrors: [createError("Source inventory lot not found", "materialInventoryLotId", "NOT_FOUND")],
        };
      }

      if (sourceLot.areaId === input.toAreaId && sourceLot.locationId === input.toLocationId) {
        return {
          lot: null,
          destinationLot: null,
          transaction: null,
          userErrors: [createError("Source and destination location cannot be the same", "toLocationId", "INVALID_INPUT")],
        };
      }

      const currentAvailable = Number(sourceLot[statusField]);
      if (currentAvailable < input.quantity) {
        return {
          lot: null,
          destinationLot: null,
          transaction: null,
          userErrors: [
            createError(
              `Insufficient ${statusName} quantity for transfer. Available: ${currentAvailable}, Requested: ${input.quantity}`,
              "quantity",
              "INSUFFICIENT_STOCK",
            ),
          ],
        };
      }

      const txNo = generateTransactionNo("TRF");

      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Decrement source lot
        const updatedSourceLot = await tx.materialInventoryLot.update({
          where: { id: sourceLot.id },
          data: {
            [statusField]: { decrement: qty },
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        // 2. Upsert destination lot
        const destinationLot = await tx.materialInventoryLot.upsert({
          where: {
            materialId_lotNo_receivingReportNo_areaId_locationId: {
              materialId: sourceLot.materialId,
              lotNo: sourceLot.lotNo,
              receivingReportNo: sourceLot.receivingReportNo ?? "",
              areaId: input.toAreaId,
              locationId: input.toLocationId,
            },
          },
          update: {
            [statusField]: { increment: qty },
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
          create: {
            materialId: sourceLot.materialId,
            lotNo: sourceLot.lotNo,
            areaId: input.toAreaId,
            locationId: input.toLocationId,
            [statusField]: qty,
            receivingReportNo: sourceLot.receivingReportNo ?? "",
            purchaseOrderNo: sourceLot.purchaseOrderNo,
            invoiceNo: sourceLot.invoiceNo,
            supplierId: sourceLot.supplierId,
            incomingDate: sourceLot.incomingDate,
            manufactureDate: sourceLot.manufactureDate,
            expirationDate: sourceLot.expirationDate,
            qcSampling: sourceLot.qcSampling,
            reason: input.reason?.trim() ?? "Location Transfer",
            createdBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        // 3. Create immutable transaction
        const transaction = await tx.materialInventoryTransaction.create({
          data: {
            transactionNo: txNo,
            transactionType: "TRANSFER_LOCATION",
            transactionDate: new Date(),
            materialId: sourceLot.materialId,
            materialInventoryLotId: sourceLot.id,
            lotNo: sourceLot.lotNo,
            fromAreaId: sourceLot.areaId,
            fromLocationId: sourceLot.locationId,
            toAreaId: input.toAreaId,
            toLocationId: input.toLocationId,
            fromStatus: statusName,
            toStatus: statusName,
            quantity: qty,
            balanceAfter: Number(updatedSourceLot[statusField]),
            reason: input.reason?.trim() ?? null,
            remarks: input.remarks?.trim() ?? null,
            createdBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        return { updatedSourceLot, destinationLot, transaction };
      });

      this.loader.clear(result.updatedSourceLot.id);
      this.loader.clear(result.destinationLot.id);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "MATERIAL_INVENTORY_TRANSFER_LOCATION",
        method: "GRAPHQL_MUTATION",
        tableName: "MaterialInventoryLot",
        recordId: String(result.updatedSourceLot.id),
        description: `Transferred ${input.quantity} of Lot ${sourceLot.lotNo} from Area ${sourceLot.areaId}/Loc ${sourceLot.locationId} to Area ${input.toAreaId}/Loc ${input.toLocationId}`,
        values: result as any,
        ipAddress,
        userAgent,
      });

      return {
        lot: result.updatedSourceLot as any,
        destinationLot: result.destinationLot as any,
        transaction: result.transaction as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  // ----------------------------------------------------
  // MUTATION: 3. Change Status
  // ----------------------------------------------------
  async changeStatus(
    input: ChangeMaterialLotStatusInput,
    context?: any,
  ): Promise<MaterialInventoryOperationPayload> {
    const validationError = validateChangeStatusInput(input);
    if (validationError) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const qty = new Prisma.Decimal(input.quantity);

      const statusFieldMap: Record<string, "availableQty" | "pendingQty" | "defectiveQty" | "allocatedQty"> = {
        AVAILABLE: "availableQty",
        PENDING: "pendingQty",
        DEFECTIVE: "defectiveQty",
        ALLOCATED: "allocatedQty",
      };

      const fromField = statusFieldMap[input.fromStatus];
      const toField = statusFieldMap[input.toStatus];

      const lot = await this.prisma.materialInventoryLot.findUnique({
        where: { id: input.materialInventoryLotId },
      });

      if (!lot) {
        return {
          lot: null,
          destinationLot: null,
          transaction: null,
          userErrors: [createError("Inventory lot not found", "materialInventoryLotId", "NOT_FOUND")],
        };
      }

      const currentFromQty = Number(lot[fromField]);
      if (currentFromQty < input.quantity) {
        return {
          lot: null,
          destinationLot: null,
          transaction: null,
          userErrors: [
            createError(
              `Insufficient ${input.fromStatus} quantity to convert. Current: ${currentFromQty}, Requested: ${input.quantity}`,
              "quantity",
              "INSUFFICIENT_STOCK",
            ),
          ],
        };
      }

      const txNo = generateTransactionNo("STC");

      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Update quantities in the same lot record
        const updatedLot = await tx.materialInventoryLot.update({
          where: { id: lot.id },
          data: {
            [fromField]: { decrement: qty },
            [toField]: { increment: qty },
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        // 2. Create immutable transaction
        const transaction = await tx.materialInventoryTransaction.create({
          data: {
            transactionNo: txNo,
            transactionType: "STATUS_CHANGE",
            transactionDate: new Date(),
            materialId: lot.materialId,
            materialInventoryLotId: lot.id,
            lotNo: lot.lotNo,
            fromAreaId: lot.areaId,
            fromLocationId: lot.locationId,
            toAreaId: lot.areaId,
            toLocationId: lot.locationId,
            fromStatus: input.fromStatus,
            toStatus: input.toStatus,
            quantity: qty,
            balanceAfter: Number(updatedLot[toField]),
            reason: input.reason.trim(),
            remarks: input.remarks?.trim() ?? null,
            createdBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        return { updatedLot, transaction };
      });

      this.loader.clear(result.updatedLot.id);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "MATERIAL_INVENTORY_STATUS_CHANGE",
        method: "GRAPHQL_MUTATION",
        tableName: "MaterialInventoryLot",
        recordId: String(result.updatedLot.id),
        description: `Changed status of ${input.quantity} from ${input.fromStatus} to ${input.toStatus} on Lot ${lot.lotNo}`,
        values: result as any,
        ipAddress,
        userAgent,
      });

      return {
        lot: result.updatedLot as any,
        destinationLot: null,
        transaction: result.transaction as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }

  // ----------------------------------------------------
  // MUTATION: 4. Discard Inventory
  // ----------------------------------------------------
  async discardInventory(
    input: DiscardMaterialInventoryInput,
    context?: any,
  ): Promise<MaterialInventoryOperationPayload> {
    const validationError = validateDiscardInput(input);
    if (validationError) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError(validationError, undefined, "INVALID_INPUT")],
      };
    }

    try {
      const { userId, ipAddress, userAgent } = extractContextInfo(context);
      const qty = new Prisma.Decimal(input.quantity);

      const lot = await this.prisma.materialInventoryLot.findUnique({
        where: { id: input.materialInventoryLotId },
      });

      if (!lot) {
        return {
          lot: null,
          destinationLot: null,
          transaction: null,
          userErrors: [createError("Inventory lot not found", "materialInventoryLotId", "NOT_FOUND")],
        };
      }

      const currentDefectiveQty = Number(lot.defectiveQty);
      if (currentDefectiveQty < input.quantity) {
        return {
          lot: null,
          destinationLot: null,
          transaction: null,
          userErrors: [
            createError(
              `Insufficient Defective quantity to discard. Current Defective: ${currentDefectiveQty}, Requested: ${input.quantity}`,
              "quantity",
              "INSUFFICIENT_STOCK",
            ),
          ],
        };
      }

      const txNo = generateTransactionNo("DSC");

      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Decrement defective quantity
        const updatedLot = await tx.materialInventoryLot.update({
          where: { id: lot.id },
          data: {
            defectiveQty: { decrement: qty },
            updatedBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        // 2. Create immutable transaction
        const transaction = await tx.materialInventoryTransaction.create({
          data: {
            transactionNo: txNo,
            transactionType: "DISCARD",
            transactionDate: new Date(),
            materialId: lot.materialId,
            materialInventoryLotId: lot.id,
            lotNo: lot.lotNo,
            fromAreaId: lot.areaId,
            fromLocationId: lot.locationId,
            fromStatus: "DEFECTIVE",
            toStatus: null,
            quantity: qty,
            balanceAfter: Number(updatedLot.defectiveQty),
            reason: input.reason.trim(),
            remarks: input.remarks?.trim() ?? null,
            createdBy: userId !== "SYSTEM" ? userId : null,
          },
        });

        return { updatedLot, transaction };
      });

      this.loader.clear(result.updatedLot.id);

      await this.auditService.log({
        userId: userId ?? "SYSTEM",
        action: "MATERIAL_INVENTORY_DISCARD",
        method: "GRAPHQL_MUTATION",
        tableName: "MaterialInventoryLot",
        recordId: String(result.updatedLot.id),
        description: `Discarded ${input.quantity} defective items from Lot ${lot.lotNo}. Reason: ${input.reason}`,
        values: result as any,
        ipAddress,
        userAgent,
      });

      return {
        lot: result.updatedLot as any,
        destinationLot: null,
        transaction: result.transaction as any,
        userErrors: [],
      };
    } catch (error) {
      return {
        lot: null,
        destinationLot: null,
        transaction: null,
        userErrors: [createError((error as Error).message)],
      };
    }
  }
}
