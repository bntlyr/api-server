import type { CreateFabricationInput, UpdateFabricationInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the Fabrication module.
 */
export function validateCreateFabricationInput(input: CreateFabricationInput): string | null {
  if (!input.code || input.code.trim() === "") {
    return "code is required";
  }
  if (input.itemId === undefined || input.itemId === null) {
    return "itemId is required";
  }
  return null;
}

export function validateUpdateFabricationInput(_input: UpdateFabricationInput): string | null {
  return null;
}
