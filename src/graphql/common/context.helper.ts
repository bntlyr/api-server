import { UnauthorizedException } from "@nestjs/common";
import { AsyncLocalStorage } from "node:async_hooks";
import type { AuthenticatedUser } from "../../auth/interfaces/auth.interface.js";

export interface RequestContextInfo {
  userId: string;
  user?: AuthenticatedUser;
  ipAddress?: string;
  userAgent: string;
}

export const requestContextStorage = new AsyncLocalStorage<{
  userId?: string;
  user?: AuthenticatedUser;
}>();

export function getCurrentUserId(): string | undefined {
  return requestContextStorage.getStore()?.userId;
}

export function extractContextInfo(context?: any): RequestContextInfo {
  const req = context?.req;
  const store = requestContextStorage.getStore();
  const user = context?.user ?? req?.user ?? store?.user;
  const userId = user?.userId ?? user?.id ?? user?.username ?? store?.userId;

  if (!userId) {
    if (context === undefined && process.env.VITEST) {
      return {
        userId: "SYSTEM",
        ipAddress: undefined,
        userAgent: "Unknown",
      };
    }
    throw new UnauthorizedException("Authentication required: user must be logged in");
  }

  requestContextStorage.enterWith({ userId, user });

  const ipAddress = req?.ip ?? (req?.headers?.["x-forwarded-for"] as string) ?? undefined;
  const userAgent = (req?.headers?.["user-agent"] as string) ?? "Unknown";

  return {
    userId,
    user,
    ipAddress,
    userAgent,
  };
}

