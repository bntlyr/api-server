import type { UserLoader } from "../../modules/user/user.loader.js";

/**
 * Resolves the employee ID for an audit user field (createdBy / updatedBy).
 *
 * If the value is a valid user primary key (UUID), it batches lookups using UserLoader
 * to return the user's `employeeId`. Falls back to `username`, `name`, or the raw string.
 */
export async function resolveAuditEmployeeId(
  userIdOrValue: string | null | undefined,
  userLoader: UserLoader,
): Promise<string | null> {
  if (!userIdOrValue) return null;
  try {
    const user = await userLoader.byId.load(userIdOrValue);
    if (user) {
      return user.employeeId || user.username || user.name || userIdOrValue;
    }
  } catch {
    // Graceful fallback to original string
  }
  return userIdOrValue;
}
