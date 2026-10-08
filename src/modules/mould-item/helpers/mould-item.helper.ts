import type { CreateMouldItemInput, UpdateMouldItemInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the MouldItem module.
 */
export function validateCreateMouldItemInput(input: CreateMouldItemInput): string | null {
  if (input.mouldId === undefined || input.mouldId === null) {
    return "mouldId is required";
  }
  if (input.itemId === undefined || input.itemId === null) {
    return "itemId is required";
  }
  return null;
}

export function validateUpdateMouldItemInput(_input: UpdateMouldItemInput): string | null {
  return null;
}
