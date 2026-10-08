import type { CreateFabRouteMachiningInput, UpdateFabRouteMachiningInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the FabRouteMachining module.
 */
export function validateCreateFabRouteMachiningInput(input: CreateFabRouteMachiningInput): string | null {
  if (input.fabRouteStepId === undefined || input.fabRouteStepId === null) {
    return "fabRouteStepId is required";
  }
  if (input.machineId === undefined || input.machineId === null) {
    return "machineId is required";
  }
  return null;
}

export function validateUpdateFabRouteMachiningInput(_input: UpdateFabRouteMachiningInput): string | null {
  return null;
}
