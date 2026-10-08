import type { CreateMachineInput, UpdateMachineInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the Machine module.
 */
export function validateCreateMachineInput(input: CreateMachineInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (!input.brand || input.brand.trim() === "") {
    return "brand is required";
  }
  if (!input.specificName || input.specificName.trim() === "") {
    return "specificName is required";
  }
  if (input.rotary === undefined || input.rotary === null) {
    return "rotary is required";
  }
  if (input.numberOfTools === undefined || input.numberOfTools === null) {
    return "numberOfTools is required";
  }
  if (input.machineTypeId === undefined || input.machineTypeId === null) {
    return "machineTypeId is required";
  }
  if (input.sectionId === undefined || input.sectionId === null) {
    return "sectionId is required";
  }
  return null;
}

export function validateUpdateMachineInput(_input: UpdateMachineInput): string | null {
  return null;
}
