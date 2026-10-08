import type { CreateMaterialSupplierInput, UpdateMaterialSupplierInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the MaterialSupplier module.
 */
export function validateCreateMaterialSupplierInput(input: CreateMaterialSupplierInput): string | null {
  if (input.materialId === undefined || input.materialId === null) {
    return "materialId is required";
  }
  if (input.supplierId === undefined || input.supplierId === null) {
    return "supplierId is required";
  }
  return null;
}

export function validateUpdateMaterialSupplierInput(_input: UpdateMaterialSupplierInput): string | null {
  return null;
}
