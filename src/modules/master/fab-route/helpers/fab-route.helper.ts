import type { CreateFabRouteInput, UpdateFabRouteInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the FabRoute module.
 */
export function validateCreateFabRouteInput(input: CreateFabRouteInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (input.fabricationId === undefined || input.fabricationId === null) {
    return "fabricationId is required";
  }
  return null;
}

export function validateUpdateFabRouteInput(_input: UpdateFabRouteInput): string | null {
  return null;
}
