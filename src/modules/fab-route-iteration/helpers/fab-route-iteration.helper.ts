import type { CreateFabRouteIterationInput, UpdateFabRouteIterationInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the FabRouteIteration module.
 */
export function validateCreateFabRouteIterationInput(input: CreateFabRouteIterationInput): string | null {
  if (!input.subname || input.subname.trim() === "") {
    return "subname is required";
  }
  if (input.fabRouteStepId === undefined || input.fabRouteStepId === null) {
    return "fabRouteStepId is required";
  }
  return null;
}

export function validateUpdateFabRouteIterationInput(_input: UpdateFabRouteIterationInput): string | null {
  return null;
}
