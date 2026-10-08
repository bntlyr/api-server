import type { CreateMaterialInput, UpdateMaterialInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the Material module.
 */
export function validateCreateMaterialInput(input: CreateMaterialInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (!input.stockKeepingUnit || input.stockKeepingUnit.trim() === "") {
    return "stockKeepingUnit is required";
  }
  if (!input.category || input.category.trim() === "") {
    return "category is required";
  }
  if (!input.type || input.type.trim() === "") {
    return "type is required";
  }
  return null;
}

export function validateUpdateMaterialInput(_input: UpdateMaterialInput): string | null {
  return null;
}
