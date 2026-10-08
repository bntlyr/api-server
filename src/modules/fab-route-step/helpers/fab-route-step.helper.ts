import type { CreateFabRouteStepInput, UpdateFabRouteStepInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the FabRouteStep module.
 */
export function validateCreateFabRouteStepInput(input: CreateFabRouteStepInput): string | null {
  if (!input.sequenceNumber || input.sequenceNumber.trim() === "") {
    return "sequenceNumber is required";
  }
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (input.fabRouteId === undefined || input.fabRouteId === null) {
    return "fabRouteId is required";
  }
  return null;
}

export function validateUpdateFabRouteStepInput(_input: UpdateFabRouteStepInput): string | null {
  return null;
}
