import type { CreateUserInput, UpdateUserInput } from "../../../generated/graphql/types.js";

/**
 * Domain helper functions for the User module.
 */
export function validateCreateUserInput(input: CreateUserInput): string | null {
  if (!input.username || input.username.trim() === "") {
    return "username is required";
  }
  if (!input.email || input.email.trim() === "") {
    return "email is required";
  }
  if (!input.password || input.password.length < 6) {
    return "password must be at least 6 characters";
  }
  return null;
}

export function validateUpdateUserInput(input: UpdateUserInput): string | null {
  if (input.password !== undefined && input.password !== null && input.password.length < 6) {
    return "password must be at least 6 characters";
  }
  return null;
}
