import type { CreateBookingInput, UpdateBookingInput } from "../../../../generated/graphql/types.js";

/**
 * Domain helper functions for the Booking module.
 */
export function validateCreateBookingInput(input: CreateBookingInput): string | null {
  if (!input.bookingNo || input.bookingNo.trim() === "") {
    return "bookingNo is required";
  }
  if (!input.itemCode || input.itemCode.trim() === "") {
    return "itemCode is required";
  }
  if (input.itemId === undefined || input.itemId === null) {
    return "itemId is required";
  }
  if (!input.orderNo || input.orderNo.trim() === "") {
    return "orderNo is required";
  }
  if (!input.lotNo || input.lotNo.trim() === "") {
    return "lotNo is required";
  }
  if (input.productionSlipId === undefined || input.productionSlipId === null) {
    return "productionSlipId is required";
  }
  if (input.productionProcessId === undefined || input.productionProcessId === null) {
    return "productionProcessId is required";
  }
  if (input.salesOrderId === undefined || input.salesOrderId === null) {
    return "salesOrderId is required";
  }
  return null;
}

export function validateUpdateBookingInput(_input: UpdateBookingInput): string | null {
  return null;
}
