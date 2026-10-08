import type { CreateItemRevisionInput, UpdateItemRevisionInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the ItemRevision module.
 */
export function validateCreateItemRevisionInput(input: CreateItemRevisionInput): string | null {
  if (!input.details || input.details.trim() === "") {
    return "details is required";
  }
  if (input.itemId === undefined || input.itemId === null) {
    return "itemId is required";
  }
  return null;
}

export function validateUpdateItemRevisionInput(_input: UpdateItemRevisionInput): string | null {
  return null;
}
