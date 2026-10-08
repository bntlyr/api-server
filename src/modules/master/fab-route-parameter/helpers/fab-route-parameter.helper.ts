import type { CreateFabRouteParameterInput, UpdateFabRouteParameterInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the FabRouteParameter module.
 */
export function validateCreateFabRouteParameterInput(input: CreateFabRouteParameterInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (input.fabRouteStepId === undefined || input.fabRouteStepId === null) {
    return "fabRouteStepId is required";
  }
  return null;
}

export function validateUpdateFabRouteParameterInput(_input: UpdateFabRouteParameterInput): string | null {
  return null;
}
