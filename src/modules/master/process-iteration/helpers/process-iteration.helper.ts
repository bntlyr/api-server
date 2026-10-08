import type { CreateProcessIterationInput, UpdateProcessIterationInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the ProcessIteration module.
 */
export function validateCreateProcessIterationInput(input: CreateProcessIterationInput): string | null {
  if (!input.subname || input.subname.trim() === "") {
    return "subname is required";
  }
  if (input.processId === undefined || input.processId === null) {
    return "processId is required";
  }
  return null;
}

export function validateUpdateProcessIterationInput(_input: UpdateProcessIterationInput): string | null {
  return null;
}
