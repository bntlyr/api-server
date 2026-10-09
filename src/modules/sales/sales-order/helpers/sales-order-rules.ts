import type {
  SalesOrderValidationRule,
  SalesOrderTransformRule,
  SalesOrderRuleContext,
  RuleViolation,
  ResolvedItemContext,
} from "./sales-order-validation.types.js";
import type { UploadSalesOrderRowInput } from "../../../../generated/graphql/types.js";
import type { Fabrication as PrismaFabrication } from "../../../../generated/prisma/client.js";

const ALLOWED_FREIGHT_TYPES = new Set(["SEA", "LAND", "AIR"]);
const PRICE_TOLERANCE = 0.001;

function arePricesDifferent(p1?: number | null, p2?: number | null): boolean {
  const val1 = Number(p1 ?? 0);
  const val2 = Number(p2 ?? 0);
  return Math.abs(val1 - val2) > PRICE_TOLERANCE;
}

/**
 * 1. Required Fields Validation Rule
 * Ensures core mandatory fields are provided and non-empty.
 */
export class RequiredFieldsRule implements SalesOrderValidationRule {
  readonly name = "RequiredFieldsRule";

  validate(row: UploadSalesOrderRowInput, context: SalesOrderRuleContext): RuleViolation | null {
    if (!row.salesOrderNo || String(row.salesOrderNo).trim() === "") {
      return {
        field: "salesOrderNo",
        reason: "PO number (salesOrderNo) is required and cannot be blank.",
        actionRequired: "Provide a valid PO number in the Excel sheet.",
      };
    }

    if (!row.salesOrderDate) {
      return {
        field: "salesOrderDate",
        reason: "PO Date (salesOrderDate) is required.",
        actionRequired: "Provide a valid PO date.",
      };
    }

    if (!row.itemCode || String(row.itemCode).trim() === "") {
      return {
        field: "itemCode",
        reason: "Item Code (itemCode) is required.",
        actionRequired: "Provide an Item Code.",
      };
    }

    if (!row.orderCode || String(row.orderCode).trim() === "") {
      return {
        field: "orderCode",
        reason: "Order Code (orderCode) is required.",
        actionRequired: "Provide an Order Code.",
      };
    }

    const orderQty = Number(row.orderQty ?? 0);
    if (orderQty <= 0) {
      return {
        field: "orderQty",
        reason: `Order Quantity must be greater than 0. Received: ${row.orderQty}`,
        actionRequired: "Enter a positive Order Quantity.",
      };
    }

    if (!row.requestedETD) {
      return {
        field: "requestedETD",
        reason: "Requested ETD (requestedETD) is required.",
        actionRequired: "Provide Requested ETD date.",
      };
    }

    if (!row.rad) {
      return {
        field: "rad",
        reason: "RAD / Required Arrival Date (rad) is required.",
        actionRequired: "Provide a valid RAD date.",
      };
    }

    if (!row.prodNo || String(row.prodNo).trim() === "") {
      return {
        field: "prodNo",
        reason: "Production / Pro Number (prodNo) is required.",
        actionRequired: "Provide a valid Pro number.",
      };
    }

    if (context.sheetType === "REVISE") {
      if (!row.orderNo || String(row.orderNo).trim() === "") {
        return {
          field: "orderNo",
          reason: "Order No is required for REVISE sheet to identify the existing order.",
          actionRequired: "Specify the Order No to revise.",
        };
      }
    }

    return null;
  }
}

/**
 * 2. Freight Type Validation Rule
 * Ensures freightType is one of Sea, Land, or Air.
 */
export class FreightTypeRule implements SalesOrderValidationRule {
  readonly name = "FreightTypeRule";

  validate(row: UploadSalesOrderRowInput): RuleViolation | null {
    if (!row.freightType || String(row.freightType).trim() === "") {
      return {
        field: "freightType",
        reason: "Freight Type is required.",
        actionRequired: "Set freight type to 'Sea', 'Land', or 'Air'.",
      };
    }

    const normalized = String(row.freightType).trim().toUpperCase();
    if (!ALLOWED_FREIGHT_TYPES.has(normalized)) {
      return {
        field: "freightType",
        reason: `Invalid Freight Type: '${row.freightType}'. Allowed values: Sea, Land, Air.`,
        actionRequired: "Change freight type to 'Sea', 'Land', or 'Air'.",
      };
    }

    return null;
  }
}

/**
 * 3. Item Resolution & Existence Rule
 * Resolves item master and fabrication master based on formatted item code.
 */
export class ItemResolutionRule implements SalesOrderValidationRule {
  readonly name = "ItemResolutionRule";

  async validate(
    row: UploadSalesOrderRowInput,
    context: SalesOrderRuleContext,
  ): Promise<RuleViolation | null> {
    const rawCode = String(row.itemCode).trim();
    if (context.itemCache.has(rawCode)) {
      const cached = context.itemCache.get(rawCode);
      if (!cached) {
        return {
          field: "itemCode",
          reason: `Item code '${rawCode}' does not exist in Item Master.`,
          actionRequired: "Register item in Item Master before uploading sales orders.",
        };
      }
      context.resolvedItem = cached;
      return null;
    }

    // Parse base item code vs fabrication code suffix
    let baseCode = rawCode;
    let fabSuffix: string | null = null;

    if (rawCode.includes("-")) {
      const parts = rawCode.split("-");
      const lastPart = parts[parts.length - 1];
      if (lastPart !== "000" && lastPart.length > 0) {
        fabSuffix = lastPart;
        parts[parts.length - 1] = "000";
        baseCode = parts.join("-");
      }
    }

    // Try finding exact item or base item
    let item = await context.prisma.item.findFirst({
      where: {
        OR: [{ itemCode: rawCode }, { itemCode: baseCode }],
        deletedAt: null,
      },
      include: {
        fabrications: {
          where: { deletedAt: null },
        },
      },
    });

    if (!item) {
      context.itemCache.set(rawCode, null);
      return {
        field: "itemCode",
        reason: `Item code '${rawCode}' not found in Item Master (searched '${rawCode}' and base '${baseCode}').`,
        actionRequired: "Register the item in Item Master first.",
      };
    }

    let resolvedFab: PrismaFabrication | null = null;
    if (fabSuffix) {
      resolvedFab = item.fabrications.find((f: PrismaFabrication) => f.code === fabSuffix) ?? null;
      if (!resolvedFab) {
        // Also check if fabrication exists directly
        resolvedFab = await context.prisma.fabrication.findFirst({
          where: {
            itemId: item.id,
            code: fabSuffix,
            deletedAt: null,
          },
        });
      }

      if (!resolvedFab) {
        context.itemCache.set(rawCode, null);
        return {
          field: "itemCode",
          reason: `Fabrication code '${fabSuffix}' for Item '${item.itemCode}' not found in Fabrication Master.`,
          actionRequired: `Register fabrication code '${fabSuffix}' under item '${item.itemCode}'.`,
        };
      }
    }

    // Resolve customer info
    let customerCode: string | null = null;
    if (item.customerId) {
      if (context.customerCache.has(item.customerId)) {
        const cust = context.customerCache.get(item.customerId);
        customerCode = cust?.code ?? null;
      } else {
        const cust = await context.prisma.customer.findFirst({
          where: { id: item.customerId, deletedAt: null },
          select: { id: true, code: true, name: true },
        });
        context.customerCache.set(item.customerId, cust);
        customerCode = cust?.code ?? null;
      }
    }

    const resolved: ResolvedItemContext = {
      itemId: item.id,
      itemCode: item.itemCode,
      fabricationId: resolvedFab?.id ?? null,
      fabCode: resolvedFab?.code ?? null,
      customerId: item.customerId ?? null,
      customerCode: customerCode ?? null,
      materialPrice: Number(item.materialPrice ?? 0),
      heatPrice: Number(item.heatPrice ?? 0),
      platePrice: Number(item.platePrice ?? 0),
      otherPrice: Number(item.otherPrice ?? 0),
      unitPrice: Number(item.unitPrice ?? 0),
      fabUnitPrice: resolvedFab ? Number(resolvedFab.unitPrice ?? resolvedFab.sellingPrice ?? 0) : null,
    };

    context.itemCache.set(rawCode, resolved);
    context.resolvedItem = resolved;
    return null;
  }
}

/**
 * 4. Price Verification Rule
 * Validates that uploaded prices match master DB prices.
 */
export class PriceVerificationRule implements SalesOrderValidationRule {
  readonly name = "PriceVerificationRule";

  validate(row: UploadSalesOrderRowInput, context: SalesOrderRuleContext): RuleViolation | null {
    const item = context.resolvedItem;
    if (!item) return null; // Handled by ItemResolutionRule

    const priceChecks = [
      {
        field: "materialPrice",
        excel: row.materialPrice,
        db: item.materialPrice,
        label: "Material Price",
      },
      {
        field: "heatPrice",
        excel: row.heatPrice,
        db: item.heatPrice,
        label: "Heat Price",
      },
      {
        field: "platePrice",
        excel: row.platePrice,
        db: item.platePrice,
        label: "Plate Price",
      },
      {
        field: "otherPrice",
        excel: row.otherPrice,
        db: item.otherPrice,
        label: "Other Price",
      },
    ];

    for (const check of priceChecks) {
      if (check.excel !== undefined && check.excel !== null) {
        if (arePricesDifferent(check.excel, check.db)) {
          return {
            field: check.field,
            reason: `Price mismatch for ${check.label}: Excel has ${check.excel} but Master DB has ${check.db}.`,
            actionRequired: `Update the Excel file to match Item Master (${check.db}) or update the Item Master.`,
          };
        }
      }
    }

    // Check Fabrication / Unit Price
    if (row.fabPrice !== undefined && row.fabPrice !== null) {
      const expectedFabPrice = item.fabUnitPrice ?? item.unitPrice;
      if (arePricesDifferent(row.fabPrice, expectedFabPrice)) {
        return {
          field: "fabPrice",
          reason: `Price mismatch for Fab/Unit Price: Excel has ${row.fabPrice} but Master DB has ${expectedFabPrice}.`,
          actionRequired: `Update the Excel file to match Master DB (${expectedFabPrice}) or update the Master DB price.`,
        };
      }
    }

    return null;
  }
}

/**
 * 5. Order Existence & Duplicate Check Rule
 */
export class OrderExistenceAndDuplicateRule implements SalesOrderValidationRule {
  readonly name = "OrderExistenceAndDuplicateRule";

  async validate(
    row: UploadSalesOrderRowInput,
    context: SalesOrderRuleContext,
  ): Promise<RuleViolation | null> {
    if (context.sheetType === "NEW") {
      // If orderNo is supplied (e.g. for CJC/CAC or manual), check for duplicates
      if (row.orderNo && String(row.orderNo).trim() !== "") {
        const orderNo = String(row.orderNo).trim();
        if (context.batchExistingOrderNos.has(orderNo)) {
          return {
            field: "orderNo",
            reason: `Duplicate Order No '${orderNo}' found in the upload batch.`,
            actionRequired: "Ensure each order number in the NEW sheet is unique.",
          };
        }

        const existing = await context.prisma.salesOrder.findFirst({
          where: { orderNo, deletedAt: null },
        });

        if (existing) {
          return {
            field: "orderNo",
            reason: `Order No '${orderNo}' already exists in the database.`,
            actionRequired: "Use the REVISE sheet if you want to update an existing order.",
          };
        }
      }
    } else if (context.sheetType === "REVISE") {
      const orderNo = String(row.orderNo).trim();
      const existing = await context.prisma.salesOrder.findFirst({
        where: { orderNo, deletedAt: null },
      });

      if (!existing) {
        return {
          field: "orderNo",
          reason: `Sales Order with Order No '${orderNo}' does not exist in the database.`,
          actionRequired: "Use the NEW sheet if this is a new order.",
        };
      }

      context.existingDbOrder = existing;
    }

    return null;
  }
}

/**
 * 6. Remarks / Data Cleansing Transform Rule (Example of Extensible Transform Rule)
 * Sanitizes strings, formats freightType properly.
 */
export class DataSanitizationTransformRule implements SalesOrderTransformRule {
  readonly name = "DataSanitizationTransformRule";

  apply(row: UploadSalesOrderRowInput): UploadSalesOrderRowInput {
    let normalizedFreight = row.freightType?.trim();
    if (normalizedFreight) {
      const upper = normalizedFreight.toUpperCase();
      if (upper === "SEA") normalizedFreight = "Sea";
      else if (upper === "LAND") normalizedFreight = "Land";
      else if (upper === "AIR") normalizedFreight = "Air";
    }

    return {
      ...row,
      orderNo: row.orderNo ? String(row.orderNo).trim() : undefined,
      salesOrderNo: row.salesOrderNo ? String(row.salesOrderNo).trim() : "",
      itemCode: row.itemCode ? String(row.itemCode).trim() : "",
      orderCode: row.orderCode ? String(row.orderCode).trim() : "",
      freightType: normalizedFreight ?? row.freightType,
      prodNo: row.prodNo ? String(row.prodNo).trim() : "",
      remarks: row.remarks ? String(row.remarks).trim() : "",
      shippingTo: row.shippingTo ? String(row.shippingTo).trim() : "",
      classOrder: row.classOrder ? String(row.classOrder).trim() : "",
      endUser: row.endUser ? String(row.endUser).trim() : "",
    };
  }
}
