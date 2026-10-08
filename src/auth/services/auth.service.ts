import { Injectable } from "@nestjs/common";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service.js";
import { TokenService } from "./token.service.js";
import { AuditTrailService } from "./audit-trail.service.js";
import type { AuthenticatedUser, UserPagePermission } from "../interfaces/auth.interface.js";

export interface LoginDto {
  usernameOrEmail: string;
  password: string;
  userAgent: string;
  ipAddress?: string;
  deviceIdentifier?: string;
}

export interface RegisterDto {
  username: string;
  email: string;
  password: string;
  name?: string;
  userAgent: string;
  ipAddress?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly auditService: AuditTrailService,
  ) {}

  async register(dto: RegisterDto) {
    // 1. Check existing username or email
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.username }, { email: dto.email }],
      },
    });

    if (existing) {
      if (existing.username === dto.username) {
        throw new Error("Username already taken");
      }
      throw new Error("Email already registered");
    }

    // 2. Hash password with bcrypt 12 salt rounds
    const hashedPassword = await this.tokenService.hashPassword(dto.password);

    // 3. Create user
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        name: dto.name ?? null,
        password: hashedPassword,
      },
    });

    // 4. Audit trail
    await this.auditService.log({
      userId: user.id,
      action: "REGISTER",
      method: "AUTH",
      tableName: "User",
      recordId: user.id,
      description: `User ${user.username} registered`,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
    });

    return this.createSessionAndTokens(user, dto.userAgent, dto.ipAddress);
  }

  async login(dto: LoginDto) {
    // 1. Find user by username or email
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: dto.usernameOrEmail }, { email: dto.usernameOrEmail }],
      },
    });

    if (!user) {
      throw new Error("Invalid username/email or password");
    }

    // 2. Validate password
    const isMatch = await this.tokenService.comparePassword(dto.password, user.password);
    if (!isMatch) {
      await this.auditService.log({
        userId: user.id,
        action: "LOGIN_FAILED",
        method: "AUTH",
        tableName: "User",
        recordId: user.id,
        description: `Failed login attempt for user ${user.username}`,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      });
      throw new Error("Invalid username/email or password");
    }

    // 3. Create session and tokens
    const result = await this.createSessionAndTokens(
      user,
      dto.userAgent,
      dto.ipAddress,
      dto.deviceIdentifier,
    );

    // 4. Audit trail
    await this.auditService.log({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      method: "AUTH",
      tableName: "Session",
      recordId: result.user.id,
      description: `User ${user.username} logged in successfully`,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
    });

    return result;
  }

  async refreshTokens(refreshToken: string, userAgent: string, ipAddress?: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.deleted || session.revokedAt || session.expiresAt < new Date()) {
      throw new Error("Invalid or expired refresh token");
    }

    // Rotate refresh token
    const newRefreshToken = randomBytes(40).toString("hex");
    const expiresAt = this.tokenService.getRefreshTokenExpiry();

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        refreshToken: newRefreshToken,
        expiresAt,
        userAgent,
        ipAddress: ipAddress ?? session.ipAddress,
      },
    });

    const user = session.user;
    const permissions = await this.getUserPermissions(user.id);

    const { token: accessToken, expiresInSeconds } = this.tokenService.generateAccessToken({
      sub: user.id,
      userId: user.id,
      username: user.username,
      email: user.email,
      sessionId: session.id,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: expiresInSeconds,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        permissions,
      },
    };
  }

  async logout(refreshToken: string, userAgent: string, ipAddress?: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
    });

    if (session) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          revokedAt: new Date(),
          deleted: true,
          deletedAt: new Date(),
          deletedBy: session.userId,
        },
      });

      await this.auditService.log({
        userId: session.userId,
        action: "LOGOUT",
        method: "AUTH",
        tableName: "Session",
        recordId: String(session.id),
        description: "User logged out session revoked",
        ipAddress,
        userAgent,
      });
    }

    return true;
  }

  async getUserPermissions(userId: string): Promise<UserPagePermission[]> {
    const userPages = await this.prisma.userPage.findMany({
      where: { userId },
      include: { page: true },
    });

    return userPages.map((up) => ({
      url: up.page.url,
      canView: up.canView,
      canModify: up.canModify,
      canUnassign: up.canUnassign,
    }));
  }

  async validateUserFromToken(token: string): Promise<AuthenticatedUser | null> {
    const payload = this.tokenService.verifyAccessToken(token);
    if (!payload) return null;

    // 1. Verify user exists and is active
    const user = await this.prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user || user.deletedAt) return null;

    // 2. Verify session is still valid and not revoked by a newer login (single active device enforcement)
    if (payload.sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
      });

      if (!session || session.deleted || session.revokedAt || session.expiresAt < new Date()) {
        return null;
      }
    }

    const permissions = await this.getUserPermissions(user.id);

    return {
      ...payload,
      name: user.name,
      permissions,
    };
  }

  private async createSessionAndTokens(
    user: { id: string; username: string; email: string; name: string | null },
    userAgent: string,
    ipAddress?: string,
    deviceIdentifier?: string,
  ) {
    // Single Active Device Enforcement:
    // Revoke all previous active sessions for this user so only 1 device can be logged in at a time
    const activeSessions = await this.prisma.session.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
        deleted: false,
      },
    });

    if (activeSessions.length > 0) {
      await this.prisma.session.updateMany({
        where: {
          userId: user.id,
          revokedAt: null,
          deleted: false,
        },
        data: {
          revokedAt: new Date(),
          deleted: true,
          deletedAt: new Date(),
          deletedBy: "SYSTEM_CONCURRENT_LOGIN_REVOKE",
        },
      });

      await this.auditService.log({
        userId: user.id,
        action: "SESSIONS_REVOKED_CONCURRENT_LOGIN",
        method: "AUTH",
        tableName: "Session",
        recordId: user.id,
        description: `Revoked ${activeSessions.length} existing active session(s) due to login from a new device`,
        ipAddress,
        userAgent,
      });
    }

    const refreshToken = randomBytes(40).toString("hex");
    const expiresAt = this.tokenService.getRefreshTokenExpiry();

    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt,
        userAgent,
        ipAddress: ipAddress ?? null,
        deviceIdentifier: deviceIdentifier ?? null,
      },
    });

    const { token: accessToken, expiresInSeconds } = this.tokenService.generateAccessToken({
      sub: user.id,
      userId: user.id,
      username: user.username,
      email: user.email,
      sessionId: session.id,
    });

    const permissions = await this.getUserPermissions(user.id);

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSeconds,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        permissions,
      },
    };
  }
}
