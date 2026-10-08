import type { CreateMouldInput, UpdateMouldInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the Mould module.
 */
export function validateCreateMouldInput(input: CreateMouldInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (!input.code || input.code.trim() === "") {
    return "code is required";
  }
  if (input.numberOfCopies === undefined || input.numberOfCopies === null) {
    return "numberOfCopies is required";
  }
  return null;
}

export function validateUpdateMouldInput(_input: UpdateMouldInput): string | null {
  return null;
}
