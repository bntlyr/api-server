export interface JwtUserPayload {
  sub: string;
  userId: string;
  username: string;
  email: string;
  sessionId: number;
  superAdmin?: boolean;
}

export interface UserPagePermission {
  url: string;
  canView: boolean;
  canModify: boolean;
  canUnassign: boolean;
}

export interface AuthenticatedUser extends JwtUserPayload {
  name?: string | null;
  superAdmin?: boolean;
  permissions: UserPagePermission[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
