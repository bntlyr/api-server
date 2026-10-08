import type { CreateMeltingInput, UpdateMeltingInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the Melting module.
 */
export function validateCreateMeltingInput(input: CreateMeltingInput): string | null {
  if (input.rawMaterialId === undefined || input.rawMaterialId === null) {
    return "rawMaterialId is required";
  }
  return null;
}

export function validateUpdateMeltingInput(_input: UpdateMeltingInput): string | null {
  return null;
}
