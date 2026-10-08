import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { AuthenticatedUser } from "../interfaces/auth.interface.js";

export interface PagePermissionRequirement {
  pageUrl: string;
  action: "view" | "modify" | "unassign";
}

export const REQUIRE_PAGE_KEY = "requirePagePermission";
export const RequirePermission = (pageUrl: string, action: "view" | "modify" | "unassign" = "view") =>
  SetMetadata(REQUIRE_PAGE_KEY, { pageUrl, action });

@Injectable()
export class PagePermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requirement = this.reflector.getAllAndOverride<PagePermissionRequirement>(
      REQUIRE_PAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requirement) {
      return true;
    }

    const gqlContext = GqlExecutionContext.create(context);
    const ctx = gqlContext.getContext();
    const user: AuthenticatedUser | undefined = ctx.user || ctx.req?.user;

    if (!user) {
      throw new ForbiddenException("Authentication required for this operation");
    }

    // SuperAdmin has full authorization across all pages and actions
    if (user.superAdmin) {
      return true;
    }

    const perm = user.permissions.find(
      (p) => p.url.toLowerCase() === requirement.pageUrl.toLowerCase(),
    );

    if (!perm) {
      throw new ForbiddenException(
        `Access Denied: You do not have permission to access page '${requirement.pageUrl}'`,
      );
    }

    if (requirement.action === "view" && !perm.canView) {
      throw new ForbiddenException(`Access Denied: View permission required for '${requirement.pageUrl}'`);
    }

    if (requirement.action === "modify" && !perm.canModify) {
      throw new ForbiddenException(`Access Denied: Modify permission required for '${requirement.pageUrl}'`);
    }

    if (requirement.action === "unassign" && !perm.canUnassign) {
      throw new ForbiddenException(`Access Denied: Unassign permission required for '${requirement.pageUrl}'`);
    }

    return true;
  }
}
