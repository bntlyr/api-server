import type { CreateItemInput, UpdateItemInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the Item module.
 */
export function validateCreateItemInput(input: CreateItemInput): string | null {
  if (!input.itemCode || input.itemCode.trim() === "") {
    return "itemCode is required";
  }
  if (!input.itemName || input.itemName.trim() === "") {
    return "itemName is required";
  }
  if (!input.specification || input.specification.trim() === "") {
    return "specification is required";
  }
  return null;
}

export function validateUpdateItemInput(_input: UpdateItemInput): string | null {
  return null;
}
