import type { CreateShipmentTypeInput, UpdateShipmentTypeInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the ShipmentType module.
 */
export function validateCreateShipmentTypeInput(input: CreateShipmentTypeInput): string | null {
  if (!input.name || input.name.trim() === "") {
    return "name is required";
  }
  if (!input.description || input.description.trim() === "") {
    return "description is required";
  }
  return null;
}

export function validateUpdateShipmentTypeInput(_input: UpdateShipmentTypeInput): string | null {
  return null;
}
