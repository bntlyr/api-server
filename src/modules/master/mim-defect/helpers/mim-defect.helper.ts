import type { CreateMimDefectInput, UpdateMimDefectInput } from "../../../../generated/graphql/types.js";

/**
 * Domain helper functions for the MimDefect module.
 */
export function validateCreateMimDefectInput(input: CreateMimDefectInput): string | null {
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

export function validateUpdateMimDefectInput(_input: UpdateMimDefectInput): string | null {
  return null;
}
