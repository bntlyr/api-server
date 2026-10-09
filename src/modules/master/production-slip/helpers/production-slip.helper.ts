import type { CreateProductionSlipInput, UpdateProductionSlipInput } from "../../../../generated/graphql/types.js";

/**
 * Domain helper functions for the ProductionSlip module.
 */
export function validateCreateProductionSlipInput(input: CreateProductionSlipInput): string | null {
  if (input.salesOrderId === undefined || input.salesOrderId === null) {
    return "salesOrderId is required";
  }
  if (!input.orderNo || input.orderNo.trim() === "") {
    return "orderNo is required";
  }
  if (!input.lotNo || input.lotNo.trim() === "") {
    return "lotNo is required";
  }
  return null;
}

export function validateUpdateProductionSlipInput(_input: UpdateProductionSlipInput): string | null {
  return null;
}
