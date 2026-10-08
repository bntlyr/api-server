import type { CreateItemTypeInput, UpdateItemTypeInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the ItemType module.
 */
export function validateCreateItemTypeInput(input: CreateItemTypeInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (!input.code || input.code.trim() === "") {
    return "code is required";
  }
  return null;
}

export function validateUpdateItemTypeInput(_input: UpdateItemTypeInput): string | null {
  return null;
}
