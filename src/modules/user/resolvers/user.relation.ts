import { StatusCodeLoader } from "../../status-code/status-code.loader.js";
import type { User as PrismaUser } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver('User')
export class UserRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statusCodeLoader: StatusCodeLoader,
  ) {}
  /**
   * Field resolver / relation resolver for User.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("statusCode")
  async statusCode(@Parent() user: PrismaUser) {
    if (!user.statusCodeId) return null;
    return this.statusCodeLoader.byId.load(user.statusCodeId);
  }
}
