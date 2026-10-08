import type { CreateItemRouteIterationInput, UpdateItemRouteIterationInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the ItemRouteIteration module.
 */
export function validateCreateItemRouteIterationInput(input: CreateItemRouteIterationInput): string | null {
  if (!input.subname || input.subname.trim() === "") {
    return "subname is required";
  }
  if (input.itemRouteStepId === undefined || input.itemRouteStepId === null) {
    return "itemRouteStepId is required";
  }
  return null;
}

export function validateUpdateItemRouteIterationInput(_input: UpdateItemRouteIterationInput): string | null {
  return null;
}
