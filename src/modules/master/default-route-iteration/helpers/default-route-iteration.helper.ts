import type { CreateDefaultRouteIterationInput, UpdateDefaultRouteIterationInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the DefaultRouteIteration module.
 */
export function validateCreateDefaultRouteIterationInput(input: CreateDefaultRouteIterationInput): string | null {
  if (!input.subname || input.subname.trim() === "") {
    return "subname is required";
  }
  if (input.defaultRouteStepId === undefined || input.defaultRouteStepId === null) {
    return "defaultRouteStepId is required";
  }
  return null;
}

export function validateUpdateDefaultRouteIterationInput(_input: UpdateDefaultRouteIterationInput): string | null {
  return null;
}
