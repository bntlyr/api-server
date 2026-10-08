import type { CreateBoxTypeInput, UpdateBoxTypeInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the BoxType module.
 */
export function validateCreateBoxTypeInput(input: CreateBoxTypeInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (!input.code || input.code.trim() === "") {
    return "code is required";
  }
  return null;
}

export function validateUpdateBoxTypeInput(_input: UpdateBoxTypeInput): string | null {
  return null;
}
