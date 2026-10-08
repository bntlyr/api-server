import type { CreateAreaInput, UpdateAreaInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the Area module.
 */
export function validateCreateAreaInput(input: CreateAreaInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (!input.category || input.category.trim() === "") {
    return "category is required";
  }
  return null;
}

export function validateUpdateAreaInput(_input: UpdateAreaInput): string | null {
  return null;
}
