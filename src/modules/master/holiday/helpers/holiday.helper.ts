import type { CreateHolidayInput, UpdateHolidayInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the Holiday module.
 */
export function validateCreateHolidayInput(input: CreateHolidayInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (input.date === undefined || input.date === null) {
    return "date is required";
  }
  return null;
}

export function validateUpdateHolidayInput(_input: UpdateHolidayInput): string | null {
  return null;
}
