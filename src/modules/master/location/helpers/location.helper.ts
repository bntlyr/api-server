import type { CreateLocationInput, UpdateLocationInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the Location module.
 */
export function validateCreateLocationInput(input: CreateLocationInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (input.areaId === undefined || input.areaId === null) {
    return "areaId is required";
  }
  return null;
}

export function validateUpdateLocationInput(_input: UpdateLocationInput): string | null {
  return null;
}
