import type { CreateProductionDtrInput, UpdateProductionDtrInput } from "../../../../generated/graphql/types.js";

/**
 * Domain helper functions for the ProductionDtr module.
 */
export function validateCreateProductionDtrInput(input: CreateProductionDtrInput): string | null {
  if (!input.userId || input.userId.trim() === "") {
    return "userId is required";
  }
  if (input.productionProcessId === undefined || input.productionProcessId === null) {
    return "productionProcessId is required";
  }
  if (!input.currentProcessName || input.currentProcessName.trim() === "") {
    return "currentProcessName is required";
  }
  if (input.startTime === undefined || input.startTime === null) {
    return "startTime is required";
  }
  return null;
}

export function validateUpdateProductionDtrInput(_input: UpdateProductionDtrInput): string | null {
  return null;
}
