import type { CreateRawMaterialInput, UpdateRawMaterialInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the RawMaterial module.
 */
export function validateCreateRawMaterialInput(input: CreateRawMaterialInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (!input.code || input.code.trim() === "") {
    return "code is required";
  }
  if (input.itemTypeId === undefined || input.itemTypeId === null) {
    return "itemTypeId is required";
  }
  return null;
}

export function validateUpdateRawMaterialInput(_input: UpdateRawMaterialInput): string | null {
  return null;
}
