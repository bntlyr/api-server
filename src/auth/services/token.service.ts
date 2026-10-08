import { Injectable } from "@nestjs/common";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import type { JwtUserPayload } from "../interfaces/auth.interface.js";

const BCRYPT_SALT_ROUNDS = 12;

@Injectable()
export class TokenService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshExpiresDays: number;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || "default_super_secret_jwt_key_bently_api_server";
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || "15m";
    this.refreshExpiresDays = parseInt(process.env.REFRESH_EXPIRES_DAYS || "7", 10);
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  generateAccessToken(payload: JwtUserPayload): { token: string; expiresInSeconds: number } {
    const token = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn as any,
    });
    return {
      token,
      expiresInSeconds: 15 * 60, // 15 minutes
    };
  }

  verifyAccessToken(token: string): JwtUserPayload | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as JwtUserPayload;
      return decoded;
    } catch {
      return null;
    }
  }

  getRefreshTokenExpiry(): Date {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshExpiresDays);
    return expiresAt;
  }
}
