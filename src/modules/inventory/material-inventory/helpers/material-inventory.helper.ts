import type {
  ChangeMaterialLotStatusInput,
  DiscardMaterialInventoryInput,
  ManualInMaterialInput,
  TransferMaterialLocationInput,
} from "../../../../generated/graphql/types.js";

/**
 * Generates a unique transaction number (e.g. MTX-20261008-0001)
 */
export function generateTransactionNo(prefix = "MTX"): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const timeSuffix = String(now.getTime()).slice(-4);
  return `${prefix}-${dateStr}-${timeSuffix}${randomSuffix}`;
}

export function validateManualInInput(input: ManualInMaterialInput): string | null {
  if (!input.materialId || input.materialId <= 0) {
    return "Valid Material ID is required";
  }
  if (!input.lotNo || input.lotNo.trim() === "") {
    return "Lot Number is required";
  }
  if (!input.quantity || input.quantity <= 0) {
    return "Quantity must be greater than 0";
  }
  if (!input.areaId || input.areaId <= 0) {
    return "Valid Area ID is required";
  }
  if (!input.locationId || input.locationId <= 0) {
    return "Valid Location ID is required";
  }
  if (!input.reason || input.reason.trim() === "") {
    return "Reason for manual in is required";
  }
  const allowedStatuses = ["AVAILABLE", "PENDING", "DEFECTIVE"];
  if (!allowedStatuses.includes(input.status)) {
    return `Status must be one of: ${allowedStatuses.join(", ")}`;
  }
  return null;
}

export function validateTransferLocationInput(input: TransferMaterialLocationInput): string | null {
  if (!input.materialInventoryLotId || input.materialInventoryLotId <= 0) {
    return "Valid Material Inventory Lot ID is required";
  }
  if (!input.toAreaId || input.toAreaId <= 0) {
    return "Valid destination Area ID is required";
  }
  if (!input.toLocationId || input.toLocationId <= 0) {
    return "Valid destination Location ID is required";
  }
  if (!input.quantity || input.quantity <= 0) {
    return "Transfer quantity must be greater than 0";
  }
  return null;
}

export function validateChangeStatusInput(input: ChangeMaterialLotStatusInput): string | null {
  if (!input.materialInventoryLotId || input.materialInventoryLotId <= 0) {
    return "Valid Material Inventory Lot ID is required";
  }
  if (!input.quantity || input.quantity <= 0) {
    return "Quantity must be greater than 0";
  }
  if (!input.fromStatus || !input.toStatus) {
    return "Both fromStatus and toStatus are required";
  }
  if (input.fromStatus === input.toStatus) {
    return "Source status and destination status must be different";
  }
  if (!input.reason || input.reason.trim() === "") {
    return "Reason for status change is required";
  }

  const validTransitions = new Set([
    "AVAILABLE->DEFECTIVE",
    "DEFECTIVE->AVAILABLE",
    "AVAILABLE->PENDING",
    "PENDING->AVAILABLE",
    "PENDING->DEFECTIVE",
    "DEFECTIVE->PENDING",
  ]);

  const transitionKey = `${input.fromStatus}->${input.toStatus}`;
  if (!validTransitions.has(transitionKey)) {
    return `Invalid status transition from ${input.fromStatus} to ${input.toStatus}`;
  }

  return null;
}

export function validateDiscardInput(input: DiscardMaterialInventoryInput): string | null {
  if (!input.materialInventoryLotId || input.materialInventoryLotId <= 0) {
    return "Valid Material Inventory Lot ID is required";
  }
  if (!input.quantity || input.quantity <= 0) {
    return "Discard quantity must be greater than 0";
  }
  if (!input.reason || input.reason.trim() === "") {
    return "Reason for discard is required";
  }
  return null;
}

/**
 * Transforms GraphQL filter inputs into Prisma where clauses with support for relational material filters
 */
export function buildLotWhereClause(filter?: any): Record<string, any> {
  if (!filter) return {};

  const where: Record<string, any> = {};

  if (filter.search) {
    const searchVal = String(filter.search).trim();
    where.OR = [
      { lotNo: { contains: searchVal, mode: "insensitive" } },
      { receivingReportNo: { contains: searchVal, mode: "insensitive" } },
      { purchaseOrderNo: { contains: searchVal, mode: "insensitive" } },
      { invoiceNo: { contains: searchVal, mode: "insensitive" } },
      { reason: { contains: searchVal, mode: "insensitive" } },
      {
        material: {
          name: { contains: searchVal, mode: "insensitive" },
        },
      },
      {
        material: {
          stockKeepingUnit: { contains: searchVal, mode: "insensitive" },
        },
      },
      {
        material: {
          oldCode: { contains: searchVal, mode: "insensitive" },
        },
      },
    ];
  }

  // Material relation filters
  const materialWhere: Record<string, any> = {};
  if (filter.sku) materialWhere.stockKeepingUnit = filter.sku;
  if (filter.oldCode) materialWhere.oldCode = filter.oldCode;
  if (filter.materialName) materialWhere.name = filter.materialName;
  if (filter.materialDescription) materialWhere.description = filter.materialDescription;
  if (filter.materialGroupId) materialWhere.materialGroupId = filter.materialGroupId;
  if (filter.rawMaterialId) materialWhere.rawMaterialId = filter.rawMaterialId;
  if (filter.sectionId) materialWhere.sectionId = filter.sectionId;

  if (Object.keys(materialWhere).length > 0) {
    where.material = materialWhere;
  }

  // Direct lot filters
  if (filter.id) where.id = filter.id;
  if (filter.materialId) where.materialId = filter.materialId;
  if (filter.lotNo) where.lotNo = filter.lotNo;
  if (filter.areaId) where.areaId = filter.areaId;
  if (filter.locationId) where.locationId = filter.locationId;
  if (filter.supplierId) where.supplierId = filter.supplierId;
  if (filter.receivingReportNo) where.receivingReportNo = filter.receivingReportNo;
  if (filter.purchaseOrderNo) where.purchaseOrderNo = filter.purchaseOrderNo;
  if (filter.invoiceNo) where.invoiceNo = filter.invoiceNo;
  if (filter.incomingDate) where.incomingDate = filter.incomingDate;
  if (filter.manufactureDate) where.manufactureDate = filter.manufactureDate;
  if (filter.expirationDate) where.expirationDate = filter.expirationDate;

  if (filter.AND) where.AND = filter.AND.map((f: any) => buildLotWhereClause(f));
  if (filter.OR) where.OR = filter.OR.map((f: any) => buildLotWhereClause(f));
  if (filter.NOT) where.NOT = filter.NOT.map((f: any) => buildLotWhereClause(f));

  return where;
}

export function buildTransactionWhereClause(filter?: any): Record<string, any> {
  if (!filter) return {};

  const where: Record<string, any> = {};

  if (filter.search) {
    const searchVal = String(filter.search).trim();
    where.OR = [
      { transactionNo: { contains: searchVal, mode: "insensitive" } },
      { lotNo: { contains: searchVal, mode: "insensitive" } },
      { reason: { contains: searchVal, mode: "insensitive" } },
      { remarks: { contains: searchVal, mode: "insensitive" } },
      { referenceNo: { contains: searchVal, mode: "insensitive" } },
      {
        material: {
          name: { contains: searchVal, mode: "insensitive" },
        },
      },
      {
        material: {
          stockKeepingUnit: { contains: searchVal, mode: "insensitive" },
        },
      },
    ];
  }

  // Material relation filters
  const materialWhere: Record<string, any> = {};
  if (filter.sku) materialWhere.stockKeepingUnit = filter.sku;
  if (filter.oldCode) materialWhere.oldCode = filter.oldCode;
  if (filter.materialName) materialWhere.name = filter.materialName;
  if (Object.keys(materialWhere).length > 0) {
    where.material = materialWhere;
  }

  // Lot relation filters
  const lotWhere: Record<string, any> = {};
  if (filter.receivingReportNo) lotWhere.receivingReportNo = filter.receivingReportNo;
  if (filter.purchaseOrderNo) lotWhere.purchaseOrderNo = filter.purchaseOrderNo;
  if (filter.supplierId) lotWhere.supplierId = filter.supplierId;
  if (Object.keys(lotWhere).length > 0) {
    where.lot = lotWhere;
  }

  // Location filters
  if (filter.areaId) {
    where.OR = [{ fromAreaId: filter.areaId }, { toAreaId: filter.areaId }];
  }
  if (filter.locationId) {
    where.OR = [{ fromLocationId: filter.locationId }, { toLocationId: filter.locationId }];
  }
  if (filter.fromAreaId) where.fromAreaId = filter.fromAreaId;
  if (filter.fromLocationId) where.fromLocationId = filter.fromLocationId;
  if (filter.toAreaId) where.toAreaId = filter.toAreaId;
  if (filter.toLocationId) where.toLocationId = filter.toLocationId;

  // Direct transaction fields
  if (filter.id) where.id = filter.id;
  if (filter.transactionNo) where.transactionNo = filter.transactionNo;
  if (filter.transactionType) where.transactionType = filter.transactionType;
  if (filter.direction) where.direction = filter.direction;
  if (filter.transactionDate) where.transactionDate = filter.transactionDate;
  if (filter.materialId) where.materialId = filter.materialId;
  if (filter.materialInventoryLotId) where.materialInventoryLotId = filter.materialInventoryLotId;
  if (filter.lotNo) where.lotNo = filter.lotNo;
  if (filter.referenceNo) where.referenceNo = filter.referenceNo;
  if (filter.fromStatus) where.fromStatus = filter.fromStatus;
  if (filter.toStatus) where.toStatus = filter.toStatus;

  if (filter.AND) where.AND = filter.AND.map((f: any) => buildTransactionWhereClause(f));
  if (filter.OR) where.OR = filter.OR.map((f: any) => buildTransactionWhereClause(f));
  if (filter.NOT) where.NOT = filter.NOT.map((f: any) => buildTransactionWhereClause(f));

  return where;
}

export function buildSummaryWhereClause(filter?: any): Record<string, any> {
  if (!filter) return {};

  const where: Record<string, any> = {};

  if (filter.search) {
    const searchVal = String(filter.search).trim();
    where.OR = [
      { name: { contains: searchVal, mode: "insensitive" } },
      { oldCode: { contains: searchVal, mode: "insensitive" } },
      { stockKeepingUnit: { contains: searchVal, mode: "insensitive" } },
      { description: { contains: searchVal, mode: "insensitive" } },
      { category: { contains: searchVal, mode: "insensitive" } },
      { type: { contains: searchVal, mode: "insensitive" } },
    ];
  }

  if (filter.materialId) where.id = filter.materialId;
  if (filter.sku) where.stockKeepingUnit = filter.sku;
  if (filter.oldCode) where.oldCode = filter.oldCode;
  if (filter.materialName) where.name = filter.materialName;
  if (filter.description) where.description = filter.description;
  if (filter.category) where.category = filter.category;
  if (filter.type) where.type = filter.type;
  if (filter.materialGroupId) where.materialGroupId = filter.materialGroupId;
  if (filter.rawMaterialId) where.rawMaterialId = filter.rawMaterialId;
  if (filter.sectionId) where.sectionId = filter.sectionId;

  if (filter.AND) where.AND = filter.AND.map((f: any) => buildSummaryWhereClause(f));
  if (filter.OR) where.OR = filter.OR.map((f: any) => buildSummaryWhereClause(f));
  if (filter.NOT) where.NOT = filter.NOT.map((f: any) => buildSummaryWhereClause(f));

  return where;
}
