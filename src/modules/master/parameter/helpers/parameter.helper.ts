import type { CreateParameterInput, UpdateParameterInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the Parameter module.
 */
export function validateCreateParameterInput(input: CreateParameterInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  return null;
}

export function validateUpdateParameterInput(_input: UpdateParameterInput): string | null {
  return null;
}
