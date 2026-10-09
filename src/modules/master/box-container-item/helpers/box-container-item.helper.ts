import type { CreateBoxContainerItemInput, UpdateBoxContainerItemInput } from "../../../../generated/graphql/types.js";

/**
 * Domain helper functions for the BoxContainerItem module.
 */
export function validateCreateBoxContainerItemInput(input: CreateBoxContainerItemInput): string | null {
  if (input.boxContainerId === undefined || input.boxContainerId === null) {
    return "boxContainerId is required";
  }
  if (input.salesOrderId === undefined || input.salesOrderId === null) {
    return "salesOrderId is required";
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
  if (input.quantity === undefined || input.quantity === null) {
    return "quantity is required";
  }
  return null;
}

export function validateUpdateBoxContainerItemInput(_input: UpdateBoxContainerItemInput): string | null {
  return null;
}
