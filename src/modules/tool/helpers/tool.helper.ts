import type { CreateToolInput, UpdateToolInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the Tool module.
 */
export function validateCreateToolInput(input: CreateToolInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (!input.code || input.code.trim() === "") {
    return "code is required";
  }
  return null;
}

export function validateUpdateToolInput(_input: UpdateToolInput): string | null {
  return null;
}
