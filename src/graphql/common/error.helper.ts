import type { UserError } from "../../generated/graphql/types.js";

export function createError(
  message: string,
  field?: string | string[],
  code?: string,
): UserError {
  return {
    message,
    field: field ? (Array.isArray(field) ? field : [field]) : null,
    code: code ?? null,
  };
}
