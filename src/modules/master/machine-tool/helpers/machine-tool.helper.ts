import type { CreateMachineToolInput, UpdateMachineToolInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the MachineTool module.
 */
export function validateCreateMachineToolInput(input: CreateMachineToolInput): string | null {
  if (input.machineId === undefined || input.machineId === null) {
    return "machineId is required";
  }
  if (input.toolId === undefined || input.toolId === null) {
    return "toolId is required";
  }
  return null;
}

export function validateUpdateMachineToolInput(_input: UpdateMachineToolInput): string | null {
  return null;
}
