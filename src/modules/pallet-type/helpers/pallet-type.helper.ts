import type { CreatePalletTypeInput, UpdatePalletTypeInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the PalletType module.
 */
export function validateCreatePalletTypeInput(input: CreatePalletTypeInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (!input.description || input.description.trim() === "") {
    return "description is required";
  }
  return null;
}

export function validateUpdatePalletTypeInput(_input: UpdatePalletTypeInput): string | null {
  return null;
}
