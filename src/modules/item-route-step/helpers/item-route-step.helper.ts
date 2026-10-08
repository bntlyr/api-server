import type { CreateItemRouteStepInput, UpdateItemRouteStepInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the ItemRouteStep module.
 */
export function validateCreateItemRouteStepInput(input: CreateItemRouteStepInput): string | null {
  if (!input.sequenceNumber || input.sequenceNumber.trim() === "") {
    return "sequenceNumber is required";
  }
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (input.itemRouteId === undefined || input.itemRouteId === null) {
    return "itemRouteId is required";
  }
  return null;
}

export function validateUpdateItemRouteStepInput(_input: UpdateItemRouteStepInput): string | null {
  return null;
}
