import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import { AuthService } from "../services/auth.service.js";
import type { AuthenticatedUser } from "../interfaces/auth.interface.js";
import { requestContextStorage } from "../../graphql/common/context.helper.js";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    let req: any;
    let ctx: any;
    let user: AuthenticatedUser | undefined;

    if (context.getType<string>() === "http") {
      req = context.switchToHttp().getRequest();
      user = req?.user;
    } else {
      const gqlContext = GqlExecutionContext.create(context);
      ctx = gqlContext.getContext();
      req = ctx?.req;
      user = ctx?.user || req?.user;
    }

    if (!user && req) {
      const authHeader = req.headers?.authorization;
      const cookieToken = req.cookies?.ACCESS_TOKEN;
      const token = authHeader
        ? authHeader.startsWith("Bearer ")
          ? authHeader.substring(7)
          : authHeader
        : cookieToken;

      if (token) {
        user = (await this.authService.validateUserFromToken(token)) ?? undefined;
        req.user = user;
        if (ctx) {
          ctx.user = user;
        }
      }
    }

    if (!user) {
      throw new UnauthorizedException("Authentication token is required or invalid");
    }

    requestContextStorage.enterWith({ userId: user.userId, user });

    return true;
  }
}

