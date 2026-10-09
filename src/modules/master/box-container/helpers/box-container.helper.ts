import type { CreateBoxContainerInput, UpdateBoxContainerInput } from "../../../../generated/graphql/types.js";

/**
 * Domain helper functions for the BoxContainer module.
 */
export function validateCreateBoxContainerInput(input: CreateBoxContainerInput): string | null {
  if (!input.boxNo || input.boxNo.trim() === "") {
    return "boxNo is required";
  }
  if (input.boxTypeId === undefined || input.boxTypeId === null) {
    return "boxTypeId is required";
  }
  if (input.areaId === undefined || input.areaId === null) {
    return "areaId is required";
  }
  if (input.locationId === undefined || input.locationId === null) {
    return "locationId is required";
  }
  return null;
}

export function validateUpdateBoxContainerInput(_input: UpdateBoxContainerInput): string | null {
  return null;
}
