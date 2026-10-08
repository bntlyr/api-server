import type { CreateRawMaterialRotationInput, UpdateRawMaterialRotationInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the RawMaterialRotation module.
 */
export function validateCreateRawMaterialRotationInput(input: CreateRawMaterialRotationInput): string | null {
  if (!input.materialClass || input.materialClass.trim() === "") {
    return "materialClass is required";
  }
  if (input.rawMaterialId === undefined || input.rawMaterialId === null) {
    return "rawMaterialId is required";
  }
  if (!input.stamping || input.stamping.trim() === "") {
    return "stamping is required";
  }
  if (input.priority === undefined || input.priority === null) {
    return "priority is required";
  }
  return null;
}

export function validateUpdateRawMaterialRotationInput(_input: UpdateRawMaterialRotationInput): string | null {
  return null;
}
