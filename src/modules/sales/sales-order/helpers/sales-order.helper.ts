import { buildPrismaWhere } from "../../../../graphql/common/filter.helper.js";
import type {
  SalesOrderFilterInput,
  UploadSalesOrderRowInput,
} from "../../../../generated/graphql/types.js";
import type {
  SalesOrderValidationRule,
  SalesOrderTransformRule,
  SalesOrderRuleContext,
  RuleViolation,
} from "./sales-order-validation.types.js";
import {
  RequiredFieldsRule,
  FreightTypeRule,
  ItemResolutionRule,
  PriceVerificationRule,
  OrderExistenceAndDuplicateRule,
  DataSanitizationTransformRule,
} from "./sales-order-rules.js";
import type { PrismaService } from "../../../../prisma/prisma.service.js";
import type { Prisma } from "../../../../generated/prisma/client.js";

/**
 * Registry of active Validation & Transform Rules.
 * Adding a new validation or transformation rule to the pipeline is as simple as adding
 * an instance of your rule to these arrays.
 */
export const DEFAULT_TRANSFORM_RULES: SalesOrderTransformRule[] = [
  new DataSanitizationTransformRule(),
];

export const DEFAULT_VALIDATION_RULES: SalesOrderValidationRule[] = [
  new RequiredFieldsRule(),
  new FreightTypeRule(),
  new ItemResolutionRule(),
  new PriceVerificationRule(),
  new OrderExistenceAndDuplicateRule(),
];

/**
 * Executes all registered transformation rules sequentially on a row.
 */
export async function applyTransformRules(
  row: UploadSalesOrderRowInput,
  context: SalesOrderRuleContext,
  transformRules: SalesOrderTransformRule[] = DEFAULT_TRANSFORM_RULES,
): Promise<UploadSalesOrderRowInput> {
  let transformed = row;
  for (const rule of transformRules) {
    transformed = await rule.apply(transformed, context);
  }
  return transformed;
}

/**
 * Executes all registered validation rules sequentially on a row.
 * Returns the first violation encountered, or null if valid.
 */
export async function runValidationRules(
  row: UploadSalesOrderRowInput,
  context: SalesOrderRuleContext,
  validationRules: SalesOrderValidationRule[] = DEFAULT_VALIDATION_RULES,
): Promise<RuleViolation | null> {
  for (const rule of validationRules) {
    const violation = await rule.validate(row, context);
    if (violation) {
      return violation;
    }
  }
  return null;
}

/**
 * Safe auto-increment sequence generation for Customer Code.
 * Generates e.g. SATO-0000001.
 */
export async function generateNextOrderNo(
  customerCode: string,
  tx: any,
): Promise<string> {
  const normalizedCode = (customerCode || "GEN").trim().toUpperCase();

  const seq = await tx.orderSequence.upsert({
    where: { customerCode: normalizedCode },
    update: { lastSequence: { increment: 1 } },
    create: { customerCode: normalizedCode, lastSequence: 1 },
  });

  const formattedSeq = String(seq.lastSequence).padStart(7, "0");
  return `${normalizedCode}-${formattedSeq}`;
}

export function buildSalesOrderWhere(filter?: SalesOrderFilterInput | null) {
  const searchFields = [
    "orderNo",
    "salesOrderNo",
    "itemCode",
    "orderCode",
    "prodNo",
    "freightType",
    "shippingTo",
    "endUser",
    "remarks",
    "status",
  ];
  return buildPrismaWhere(filter, searchFields);
}
