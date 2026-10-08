import type { CreateSectionInput, UpdateSectionInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the Section module.
 */
export function validateCreateSectionInput(input: CreateSectionInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  return null;
}

export function validateUpdateSectionInput(_input: UpdateSectionInput): string | null {
  return null;
}
