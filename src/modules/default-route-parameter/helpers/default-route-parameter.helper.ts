import type { CreateDefaultRouteParameterInput, UpdateDefaultRouteParameterInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the DefaultRouteParameter module.
 */
export function validateCreateDefaultRouteParameterInput(input: CreateDefaultRouteParameterInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (input.defaultRouteStepId === undefined || input.defaultRouteStepId === null) {
    return "defaultRouteStepId is required";
  }
  return null;
}

export function validateUpdateDefaultRouteParameterInput(_input: UpdateDefaultRouteParameterInput): string | null {
  return null;
}
