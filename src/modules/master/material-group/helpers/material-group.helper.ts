import type { CreateMaterialGroupInput, UpdateMaterialGroupInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the MaterialGroup module.
 */
export function validateCreateMaterialGroupInput(input: CreateMaterialGroupInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (!input.code || input.code.trim() === "") {
    return "code is required";
  }
  return null;
}

export function validateUpdateMaterialGroupInput(_input: UpdateMaterialGroupInput): string | null {
  return null;
}
