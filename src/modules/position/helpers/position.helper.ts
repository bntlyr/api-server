import type { CreatePositionInput, UpdatePositionInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the Position module.
 */
export function validateCreatePositionInput(input: CreatePositionInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  return null;
}

export function validateUpdatePositionInput(_input: UpdatePositionInput): string | null {
  return null;
}
