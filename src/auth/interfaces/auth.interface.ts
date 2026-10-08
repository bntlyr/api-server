export interface JwtUserPayload {
  sub: string;
  userId: string;
  username: string;
  email: string;
  sessionId: number;
}

export interface UserPagePermission {
  url: string;
  canView: boolean;
  canModify: boolean;
  canUnassign: boolean;
}

export interface AuthenticatedUser extends JwtUserPayload {
  name?: string | null;
  permissions: UserPagePermission[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
