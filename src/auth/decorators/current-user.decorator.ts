import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { AuthenticatedUser } from "../interfaces/auth.interface.js";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined => {
    if (context.getType<string>() === "http") {
      const req = context.switchToHttp().getRequest();
      return req?.user;
    }
    const gqlContext = GqlExecutionContext.create(context);
    const ctx = gqlContext.getContext();
    return ctx?.user || ctx?.req?.user;
  },
);
