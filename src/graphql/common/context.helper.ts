export interface RequestContextInfo {
  userId: string;
  ipAddress?: string;
  userAgent: string;
}

export function extractContextInfo(context?: any): RequestContextInfo {
  const req = context?.req;
  const user = context?.user ?? req?.user;
  const userId = user?.userId ?? user?.id ?? "SYSTEM";
  const ipAddress = req?.ip ?? (req?.headers?.["x-forwarded-for"] as string) ?? undefined;
  const userAgent = (req?.headers?.["user-agent"] as string) ?? "Unknown";

  return {
    userId,
    ipAddress,
    userAgent,
  };
}
