import type { CreateDefaultRouteInput, UpdateDefaultRouteInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the DefaultRoute module.
 */
export function validateCreateDefaultRouteInput(input: CreateDefaultRouteInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (input.itemTypeId === undefined || input.itemTypeId === null) {
    return "itemTypeId is required";
  }
  return null;
}

export function validateUpdateDefaultRouteInput(_input: UpdateDefaultRouteInput): string | null {
  return null;
}
