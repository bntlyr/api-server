import type { CreateItemRouteMachiningInput, UpdateItemRouteMachiningInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the ItemRouteMachining module.
 */
export function validateCreateItemRouteMachiningInput(input: CreateItemRouteMachiningInput): string | null {
  if (input.itemRouteStepId === undefined || input.itemRouteStepId === null) {
    return "itemRouteStepId is required";
  }
  if (input.machineId === undefined || input.machineId === null) {
    return "machineId is required";
  }
  return null;
}

export function validateUpdateItemRouteMachiningInput(_input: UpdateItemRouteMachiningInput): string | null {
  return null;
}
