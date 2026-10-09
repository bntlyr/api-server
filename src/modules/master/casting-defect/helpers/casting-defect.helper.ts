import type { CreateCastingDefectInput, UpdateCastingDefectInput } from "../../../../generated/graphql/types.js";

/**
 * Domain helper functions for the CastingDefect module.
 */
export function validateCreateCastingDefectInput(input: CreateCastingDefectInput): string | null {
  if (input.bookingId === undefined || input.bookingId === null) {
    return "bookingId is required";
  }
  if (input.productionSlipId === undefined || input.productionSlipId === null) {
    return "productionSlipId is required";
  }
  if (input.salesOrderId === undefined || input.salesOrderId === null) {
    return "salesOrderId is required";
  }
  if (input.itemId === undefined || input.itemId === null) {
    return "itemId is required";
  }
  if (!input.itemCode || input.itemCode.trim() === "") {
    return "itemCode is required";
  }
  return null;
}

export function validateUpdateCastingDefectInput(_input: UpdateCastingDefectInput): string | null {
  return null;
}
