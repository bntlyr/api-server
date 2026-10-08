import type {
  BatchManualInFinishedGoodsInput,
  BatchMoveFinishedGoodsInput,
  ChangeFinishedGoodsStatusInput,
  DiscardFinishedGoodsInput,
  ManualInFinishedGoodsInput,
  ManualOutFinishedGoodsInput,
  MoveFinishedGoodsInput,
  UpdateFinishedGoodsBoxTypeInput,
} from "../../../../generated/graphql/types.js";

/**
 * Formats item code with fabrication suffix: e.g. 10-00000-000 + 100 -> 10-00000-100
 */
export function formatFGItemCode(baseItemCode: string, fabCode?: string | null): string {
  if (!fabCode || fabCode.trim() === "") return baseItemCode;
  const cleanFab = fabCode.trim();
  if (cleanFab.includes("-")) return cleanFab;
  if (baseItemCode.endsWith("-000")) {
    return `${baseItemCode.slice(0, -4)}-${cleanFab}`;
  }
  return `${baseItemCode}-${cleanFab}`;
}

/**
 * Generates a unique transaction number (e.g. FGTX-20261008-0001)
 */
export function generateFGTransactionNo(prefix = "FGTX"): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const timeSuffix = String(now.getTime()).slice(-4);
  return `${prefix}-${dateStr}-${timeSuffix}${randomSuffix}`;
}

export function validateManualInInput(input: ManualInFinishedGoodsInput): string | null {
  if (!input.itemId || input.itemId <= 0) {
    return "Valid Item ID is required";
  }
  if (!input.fabricationId || input.fabricationId <= 0) {
    return "Valid Fabrication ID is required";
  }
  if (!input.orderNo || input.orderNo.trim() === "") {
    return "Order Number is required";
  }
  if (!input.lotNo || input.lotNo.trim() === "") {
    return "Lot Number is required";
  }
  if (!input.chargeNo || input.chargeNo.trim() === "") {
    return "Charge Number is required";
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
  const allowedStatuses = ["AVAILABLE", "CHECKING", "DEFECTIVE"];
  if (!allowedStatuses.includes(input.status)) {
    return `Status must be one of: ${allowedStatuses.join(", ")}`;
  }
  return null;
}

export function validateBatchManualInInput(input: BatchManualInFinishedGoodsInput): string | null {
  if (!input.itemId || input.itemId <= 0) {
    return "Valid Item ID is required";
  }
  if (!input.fabricationId || input.fabricationId <= 0) {
    return "Valid Fabrication ID is required";
  }
  if (!input.orderNo || input.orderNo.trim() === "") {
    return "Order Number is required";
  }
  if (!input.items || input.items.length === 0) {
    return "At least one lot item must be provided";
  }
  if (!input.reason || input.reason.trim() === "") {
    return "Reason is required";
  }

  const allowedStatuses = ["AVAILABLE", "CHECKING", "DEFECTIVE"];
  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i];
    if (!item.lotNo || item.lotNo.trim() === "") {
      return `Item at index ${i}: Lot Number is required`;
    }
    if (!item.chargeNo || item.chargeNo.trim() === "") {
      return `Item at index ${i}: Charge Number is required`;
    }
    if (!item.quantity || item.quantity <= 0) {
      return `Item at index ${i}: Quantity must be greater than 0`;
    }
    if (!item.areaId || item.areaId <= 0) {
      return `Item at index ${i}: Valid Area ID is required`;
    }
    if (!item.locationId || item.locationId <= 0) {
      return `Item at index ${i}: Valid Location ID is required`;
    }
    if (!allowedStatuses.includes(item.status)) {
      return `Item at index ${i}: Status must be one of: ${allowedStatuses.join(", ")}`;
    }
  }

  return null;
}

export function validateChangeStatusInput(input: ChangeFinishedGoodsStatusInput): string | null {
  if (!input.finishedGoodsLotId || input.finishedGoodsLotId <= 0) {
    return "Valid Finished Goods Lot ID is required";
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
    "AVAILABLE->CHECKING",
    "CHECKING->AVAILABLE",
    "CHECKING->DEFECTIVE",
    "DEFECTIVE->CHECKING",
    "AVAILABLE->ALLOCATED",
    "ALLOCATED->AVAILABLE",
  ]);

  const transitionKey = `${input.fromStatus}->${input.toStatus}`;
  if (!validTransitions.has(transitionKey)) {
    return `Invalid status transition from ${input.fromStatus} to ${input.toStatus}`;
  }

  return null;
}

export function validateManualOutInput(input: ManualOutFinishedGoodsInput): string | null {
  if (!input.finishedGoodsLotId || input.finishedGoodsLotId <= 0) {
    return "Valid Finished Goods Lot ID is required";
  }
  if (!input.quantity || input.quantity <= 0) {
    return "Quantity must be greater than 0";
  }
  if (!input.reason || input.reason.trim() === "") {
    return "Reason for manual out is required";
  }
  return null;
}

export function validateDiscardInput(input: DiscardFinishedGoodsInput): string | null {
  if (!input.finishedGoodsLotId || input.finishedGoodsLotId <= 0) {
    return "Valid Finished Goods Lot ID is required";
  }
  if (!input.quantity || input.quantity <= 0) {
    return "Discard quantity must be greater than 0";
  }
  if (!input.reason || input.reason.trim() === "") {
    return "Reason for discard is required";
  }
  return null;
}

export function validateMoveInput(input: MoveFinishedGoodsInput): string | null {
  if (!input.finishedGoodsLotId || input.finishedGoodsLotId <= 0) {
    return "Valid Finished Goods Lot ID is required";
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

export function validateBatchMoveInput(input: BatchMoveFinishedGoodsInput): string | null {
  if (!input.items || input.items.length === 0) {
    return "At least one item must be provided to move";
  }
  if (!input.toAreaId || input.toAreaId <= 0) {
    return "Valid destination Area ID is required";
  }
  if (!input.toLocationId || input.toLocationId <= 0) {
    return "Valid destination Location ID is required";
  }
  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i];
    if (!item.finishedGoodsLotId || item.finishedGoodsLotId <= 0) {
      return `Item at index ${i}: Valid Finished Goods Lot ID is required`;
    }
    if (!item.quantity || item.quantity <= 0) {
      return `Item at index ${i}: Quantity must be greater than 0`;
    }
  }
  return null;
}

export function validateUpdateBoxTypeInput(input: UpdateFinishedGoodsBoxTypeInput): string | null {
  if (!input.finishedGoodsLotId || input.finishedGoodsLotId <= 0) {
    return "Valid Finished Goods Lot ID is required";
  }
  return null;
}

/**
 * Transforms GraphQL filter inputs into Prisma where clauses with support for item and fab filters
 */
export function buildFGLotWhereClause(filter?: any): Record<string, any> {
  if (!filter) return {};

  const where: Record<string, any> = {};

  if (filter.search) {
    const searchVal = String(filter.search).trim();
    where.OR = [
      { orderNo: { contains: searchVal, mode: "insensitive" } },
      { lotNo: { contains: searchVal, mode: "insensitive" } },
      { chargeNo: { contains: searchVal, mode: "insensitive" } },
      { trialLotNo: { contains: searchVal, mode: "insensitive" } },
      { invoiceNo: { contains: searchVal, mode: "insensitive" } },
      { reason: { contains: searchVal, mode: "insensitive" } },
      { remarks: { contains: searchVal, mode: "insensitive" } },
      {
        item: {
          itemCode: { contains: searchVal, mode: "insensitive" },
        },
      },
      {
        item: {
          itemName: { contains: searchVal, mode: "insensitive" },
        },
      },
      {
        fabrication: {
          code: { contains: searchVal, mode: "insensitive" },
        },
      },
    ];
  }

  // Item relation filters
  const itemWhere: Record<string, any> = {};
  if (filter.itemCode) itemWhere.itemCode = filter.itemCode;
  if (filter.itemName) itemWhere.itemName = filter.itemName;
  if (Object.keys(itemWhere).length > 0) {
    where.item = itemWhere;
  }

  // Fab relation filters
  if (filter.fabCode) {
    where.fabrication = { code: filter.fabCode };
  }

  // Area category filter
  if (filter.areaCategory) {
    where.area = { category: filter.areaCategory };
  }

  // Direct lot filters
  if (filter.id) where.id = filter.id;
  if (filter.itemId) where.itemId = filter.itemId;
  if (filter.fabricationId) where.fabricationId = filter.fabricationId;
  if (filter.orderNo) where.orderNo = filter.orderNo;
  if (filter.lotNo) where.lotNo = filter.lotNo;
  if (filter.chargeNo) where.chargeNo = filter.chargeNo;
  if (filter.trialLotNo) where.trialLotNo = filter.trialLotNo;
  if (filter.invoiceNo) where.invoiceNo = filter.invoiceNo;
  if (filter.areaId) where.areaId = filter.areaId;
  if (filter.locationId) where.locationId = filter.locationId;
  if (filter.boxId) where.boxId = filter.boxId;
  if (filter.incomingDate) where.incomingDate = filter.incomingDate;
  if (filter.manufactureDate) where.manufactureDate = filter.manufactureDate;
  if (filter.stickerPrinted !== undefined && filter.stickerPrinted !== null) {
    where.stickerPrinted = filter.stickerPrinted;
  }

  if (filter.AND) where.AND = filter.AND.map((f: any) => buildFGLotWhereClause(f));
  if (filter.OR) where.OR = filter.OR.map((f: any) => buildFGLotWhereClause(f));
  if (filter.NOT) where.NOT = filter.NOT.map((f: any) => buildFGLotWhereClause(f));

  return where;
}

export function buildFGTransactionWhereClause(filter?: any): Record<string, any> {
  if (!filter) return {};

  const where: Record<string, any> = {};

  if (filter.search) {
    const searchVal = String(filter.search).trim();
    where.OR = [
      { transactionNo: { contains: searchVal, mode: "insensitive" } },
      { orderNo: { contains: searchVal, mode: "insensitive" } },
      { lotNo: { contains: searchVal, mode: "insensitive" } },
      { chargeNo: { contains: searchVal, mode: "insensitive" } },
      { invoiceNo: { contains: searchVal, mode: "insensitive" } },
      { reason: { contains: searchVal, mode: "insensitive" } },
      { remarks: { contains: searchVal, mode: "insensitive" } },
      { referenceNo: { contains: searchVal, mode: "insensitive" } },
      {
        item: {
          itemCode: { contains: searchVal, mode: "insensitive" },
        },
      },
      {
        item: {
          itemName: { contains: searchVal, mode: "insensitive" },
        },
      },
      {
        fabrication: {
          code: { contains: searchVal, mode: "insensitive" },
        },
      },
    ];
  }

  // Item relation filters
  const itemWhere: Record<string, any> = {};
  if (filter.itemCode) itemWhere.itemCode = filter.itemCode;
  if (filter.itemName) itemWhere.itemName = filter.itemName;
  if (Object.keys(itemWhere).length > 0) {
    where.item = itemWhere;
  }

  // Fab relation filters
  if (filter.fabCode) {
    where.fabrication = { code: filter.fabCode };
  }

  // Area & Location filters
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
  if (filter.fromBoxId) where.fromBoxId = filter.fromBoxId;
  if (filter.toBoxId) where.toBoxId = filter.toBoxId;

  // Direct transaction fields
  if (filter.id) where.id = filter.id;
  if (filter.transactionNo) where.transactionNo = filter.transactionNo;
  if (filter.transactionType) where.transactionType = filter.transactionType;
  if (filter.direction) where.direction = filter.direction;
  if (filter.transactionDate) where.transactionDate = filter.transactionDate;
  if (filter.itemId) where.itemId = filter.itemId;
  if (filter.fabricationId) where.fabricationId = filter.fabricationId;
  if (filter.finishedGoodsLotId) where.finishedGoodsLotId = filter.finishedGoodsLotId;
  if (filter.orderNo) where.orderNo = filter.orderNo;
  if (filter.lotNo) where.lotNo = filter.lotNo;
  if (filter.chargeNo) where.chargeNo = filter.chargeNo;
  if (filter.referenceNo) where.referenceNo = filter.referenceNo;
  if (filter.invoiceNo) where.invoiceNo = filter.invoiceNo;
  if (filter.fromStatus) where.fromStatus = filter.fromStatus;
  if (filter.toStatus) where.toStatus = filter.toStatus;

  if (filter.AND) where.AND = filter.AND.map((f: any) => buildFGTransactionWhereClause(f));
  if (filter.OR) where.OR = filter.OR.map((f: any) => buildFGTransactionWhereClause(f));
  if (filter.NOT) where.NOT = filter.NOT.map((f: any) => buildFGTransactionWhereClause(f));

  return where;
}

export function buildFGSummaryWhereClause(filter?: any): Record<string, any> {
  if (!filter) return {};

  const where: Record<string, any> = {};

  if (filter.search) {
    const searchVal = String(filter.search).trim();
    where.OR = [
      {
        item: {
          itemCode: { contains: searchVal, mode: "insensitive" },
        },
      },
      {
        item: {
          itemName: { contains: searchVal, mode: "insensitive" },
        },
      },
      {
        item: {
          description: { contains: searchVal, mode: "insensitive" },
        },
      },
      {
        code: { contains: searchVal, mode: "insensitive" },
      },
    ];
  }

  if (filter.itemId) where.itemId = filter.itemId;
  if (filter.fabricationId) where.id = filter.fabricationId;
  if (filter.fabCode) where.code = filter.fabCode;

  const itemWhere: Record<string, any> = {};
  if (filter.itemCode) itemWhere.itemCode = filter.itemCode;
  if (filter.itemName) itemWhere.itemName = filter.itemName;
  if (filter.description) itemWhere.description = filter.description;
  if (filter.itemTypeId) itemWhere.itemTypeId = filter.itemTypeId;
  if (filter.rawMaterialId) itemWhere.rawMaterialId = filter.rawMaterialId;

  if (Object.keys(itemWhere).length > 0) {
    where.item = itemWhere;
  }

  if (filter.AND) where.AND = filter.AND.map((f: any) => buildFGSummaryWhereClause(f));
  if (filter.OR) where.OR = filter.OR.map((f: any) => buildFGSummaryWhereClause(f));
  if (filter.NOT) where.NOT = filter.NOT.map((f: any) => buildFGSummaryWhereClause(f));

  return where;
}
