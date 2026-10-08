import type { CreateMouldTypeInput, UpdateMouldTypeInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the MouldType module.
 */
export function validateCreateMouldTypeInput(input: CreateMouldTypeInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  return null;
}

export function validateUpdateMouldTypeInput(_input: UpdateMouldTypeInput): string | null {
  return null;
}
