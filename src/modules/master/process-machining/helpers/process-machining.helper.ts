import type { CreateProcessMachiningInput, UpdateProcessMachiningInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the ProcessMachining module.
 */
export function validateCreateProcessMachiningInput(input: CreateProcessMachiningInput): string | null {
  if (input.processId === undefined || input.processId === null) {
    return "processId is required";
  }
  if (input.machineId === undefined || input.machineId === null) {
    return "machineId is required";
  }
  return null;
}

export function validateUpdateProcessMachiningInput(_input: UpdateProcessMachiningInput): string | null {
  return null;
}
