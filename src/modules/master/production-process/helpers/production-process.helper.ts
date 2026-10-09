import type { CreateProductionProcessInput, UpdateProductionProcessInput } from "../../../../generated/graphql/types.js";

/**
 * Domain helper functions for the ProductionProcess module.
 */
export function validateCreateProductionProcessInput(input: CreateProductionProcessInput): string | null {
  if (input.productionSlipId === undefined || input.productionSlipId === null) {
    return "productionSlipId is required";
  }
  if (input.stepNo === undefined || input.stepNo === null) {
    return "stepNo is required";
  }
  if (!input.processName || input.processName.trim() === "") {
    return "processName is required";
  }
  return null;
}

export function validateUpdateProductionProcessInput(_input: UpdateProductionProcessInput): string | null {
  return null;
}
