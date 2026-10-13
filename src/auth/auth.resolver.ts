import { Args, Context, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AuthService } from "./services/auth.service.js";
import { Public } from "./guards/jwt-auth.guard.js";
import { CurrentUser } from "./decorators/current-user.decorator.js";
import type { AuthenticatedUser } from "./interfaces/auth.interface.js";
import type { GraphQLContext } from "../graphql/context.js";

@Resolver()
export class AuthResolver {
  constructor(private readonly authService: AuthService) {}

  @Query("me")
  async me(@CurrentUser() user?: AuthenticatedUser) {
    if (!user) return null;
    return {
      id: user.userId,
      username: user.username,
      email: user.email,
      name: user.name,
      permissions: user.permissions,
    };
  }

  @Public()
  @Mutation("register")
  async register(
    @Args("input") input: { username: string; email: string; password: string; name?: string },
    @Context() context: GraphQLContext,
  ) {
    try {
      const userAgent = context.req?.headers["user-agent"] || "Unknown";
      const ipAddress = (context.req?.headers["x-forwarded-for"] as string) || context.req?.socket?.remoteAddress;

      const result = await this.authService.register({
        ...input,
        userAgent,
        ipAddress,
      });

      return {
        ...result,
        userErrors: [],
      };
    } catch (error) {
      return {
        accessToken: null,
        refreshToken: null,
        expiresIn: null,
        user: null,
        userErrors: [{ message: (error as Error).message }],
      };
    }
  }

  @Public()
  @Mutation("login")
  async login(
    @Args("input") input: { usernameOrEmail: string; password: string; deviceIdentifier?: string },
    @Context() context: GraphQLContext,
  ) {
    try {
      const userAgent = context.req?.headers["user-agent"] || "Unknown";
      const ipAddress = (context.req?.headers["x-forwarded-for"] as string) || context.req?.socket?.remoteAddress;

      const result = await this.authService.login({
        ...input,
        userAgent,
        ipAddress,
      });

      return {
        ...result,
        userErrors: [],
      };
    } catch (error) {
      return {
        accessToken: null,
        refreshToken: null,
        expiresIn: null,
        user: null,
        userErrors: [{ message: (error as Error).message }],
      };
    }
  }

  @Public()
  @Mutation("refreshTokens")
  async refreshTokens(
    @Args("refreshToken") refreshToken: string,
    @Context() context: GraphQLContext,
  ) {
    try {
      const userAgent = context.req?.headers["user-agent"] || "Unknown";
      const ipAddress = (context.req?.headers["x-forwarded-for"] as string) || context.req?.socket?.remoteAddress;

      const result = await this.authService.refreshTokens(refreshToken, userAgent, ipAddress);

      return {
        ...result,
        userErrors: [],
      };
    } catch (error) {
      return {
        accessToken: null,
        refreshToken: null,
        expiresIn: null,
        user: null,
        userErrors: [{ message: (error as Error).message }],
      };
    }
  }

  @Public()
  @Mutation("logout")
  async logout(
    @Args("refreshToken") refreshToken: string,
    @Context() context: GraphQLContext,
  ) {
    try {
      const userAgent = context.req?.headers["user-agent"] || "Unknown";
      const ipAddress = (context.req?.headers["x-forwarded-for"] as string) || context.req?.socket?.remoteAddress;

      const success = await this.authService.logout(refreshToken, userAgent, ipAddress);

      return {
        success,
        userErrors: [],
      };
    } catch (error) {
      return {
        success: false,
        userErrors: [{ message: (error as Error).message }],
      };
    }
  }

  @Mutation("verifyCurrentPassword")
  async verifyCurrentPassword(
    @Args("password") password: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user?.userId) {
      return {
        valid: false,
        userErrors: [{ message: "Unauthorized" }],
      };
    }
    try {
      const valid = await this.authService.verifyCurrentPassword(user.userId, password);
      return {
        valid,
        userErrors: valid ? [] : [{ message: "Incorrect password." }],
      };
    } catch (error) {
      return {
        valid: false,
        userErrors: [{ message: (error as Error).message }],
      };
    }
  }
}
