import type {
  CreateUnitOfMeasurementInput,
  UpdateUnitOfMeasurementInput,
} from '../../../../generated//graphql/types.js';

/**
 * Domain helper functions for the UnitOfMeasurement module.
 */
export function validateCreateUnitOfMeasurementInput(
  input: CreateUnitOfMeasurementInput,
): string | null {
  if (!input.name || input.name.trim() === '') {
    return 'name is required';
  }
  if (!input.code || input.code.trim() === '') {
    return 'code is required';
  }
  return null;
}

export function validateUpdateUnitOfMeasurementInput(
  _input: UpdateUnitOfMeasurementInput,
): string | null {
  return null;
}
