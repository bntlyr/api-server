import type { CreateDefaultRouteMachiningInput, UpdateDefaultRouteMachiningInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the DefaultRouteMachining module.
 */
export function validateCreateDefaultRouteMachiningInput(input: CreateDefaultRouteMachiningInput): string | null {
  if (input.defaultRouteStepId === undefined || input.defaultRouteStepId === null) {
    return "defaultRouteStepId is required";
  }
  if (input.machineId === undefined || input.machineId === null) {
    return "machineId is required";
  }
  return null;
}

export function validateUpdateDefaultRouteMachiningInput(_input: UpdateDefaultRouteMachiningInput): string | null {
  return null;
}
