import type { CreateMachineTypeInput, UpdateMachineTypeInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the MachineType module.
 */
export function validateCreateMachineTypeInput(input: CreateMachineTypeInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  return null;
}

export function validateUpdateMachineTypeInput(_input: UpdateMachineTypeInput): string | null {
  return null;
}
