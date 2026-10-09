import type { PrismaService } from "../../../../prisma/prisma.service.js";
import type { UploadSalesOrderRowInput, SalesOrderUploadError } from "../../../../generated/graphql/types.js";
import type { Prisma } from "../../../../generated/prisma/client.js";

export type SheetType = "NEW" | "REVISE";

export interface ResolvedItemContext {
  itemId: number;
  itemCode: string;
  fabricationId?: number | null;
  fabCode?: string | null;
  customerId?: number | null;
  customerCode?: string | null;
  materialPrice: number;
  heatPrice: number;
  platePrice: number;
  otherPrice: number;
  unitPrice: number;
  fabUnitPrice?: number | null;
}

export interface SalesOrderRuleContext {
  prisma: PrismaService;
  sheetType: SheetType;
  rowNumber: number;
  existingDbOrder?: any | null;
  batchExistingOrderNos: Set<string>;
  itemCache: Map<string, ResolvedItemContext | null>;
  customerCache: Map<number, { id: number; code: string; name: string } | null>;
  resolvedItem?: ResolvedItemContext | null;
  resolvedOrderNo?: string | null;
}

export interface RuleViolation {
  field?: string;
  reason: string;
  actionRequired?: string;
}

export interface SalesOrderValidationRule {
  readonly name: string;
  validate(
    row: UploadSalesOrderRowInput,
    context: SalesOrderRuleContext,
  ): Promise<RuleViolation | null> | RuleViolation | null;
}

export interface SalesOrderTransformRule {
  readonly name: string;
  apply(
    row: UploadSalesOrderRowInput,
    context: SalesOrderRuleContext,
  ): Promise<UploadSalesOrderRowInput> | UploadSalesOrderRowInput;
}
