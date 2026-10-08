import type { CreateDefaultRouteStepInput, UpdateDefaultRouteStepInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the DefaultRouteStep module.
 */
export function validateCreateDefaultRouteStepInput(input: CreateDefaultRouteStepInput): string | null {
  if (!input.sequenceNumber || input.sequenceNumber.trim() === "") {
    return "sequenceNumber is required";
  }
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (input.defaultRouteId === undefined || input.defaultRouteId === null) {
    return "defaultRouteId is required";
  }
  return null;
}

export function validateUpdateDefaultRouteStepInput(_input: UpdateDefaultRouteStepInput): string | null {
  return null;
}
