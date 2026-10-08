import type { CreateProcessInput, UpdateProcessInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the Process module.
 */
export function validateCreateProcessInput(input: CreateProcessInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  return null;
}

export function validateUpdateProcessInput(_input: UpdateProcessInput): string | null {
  return null;
}
