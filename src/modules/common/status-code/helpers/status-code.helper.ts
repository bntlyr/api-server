import type { CreateStatusCodeInput, UpdateStatusCodeInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the StatusCode module.
 */
export function validateCreateStatusCodeInput(input: CreateStatusCodeInput): string | null {
  if (!input.title || input.title.trim() === "") {
    return "title is required";
  }
  return null;
}

export function validateUpdateStatusCodeInput(_input: UpdateStatusCodeInput): string | null {
  return null;
}
