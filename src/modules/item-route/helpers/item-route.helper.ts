import type { CreateItemRouteInput, UpdateItemRouteInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the ItemRoute module.
 */
export function validateCreateItemRouteInput(input: CreateItemRouteInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (input.itemId === undefined || input.itemId === null) {
    return "itemId is required";
  }
  return null;
}

export function validateUpdateItemRouteInput(_input: UpdateItemRouteInput): string | null {
  return null;
}
