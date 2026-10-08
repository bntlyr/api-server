import type { CreateItemRouteParameterInput, UpdateItemRouteParameterInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the ItemRouteParameter module.
 */
export function validateCreateItemRouteParameterInput(input: CreateItemRouteParameterInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (input.itemRouteStepId === undefined || input.itemRouteStepId === null) {
    return "itemRouteStepId is required";
  }
  return null;
}

export function validateUpdateItemRouteParameterInput(_input: UpdateItemRouteParameterInput): string | null {
  return null;
}
