import { UserLoader } from "../../user/user.loader.js";
import type { StatusCode as PrismaStatusCode } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("StatusCode")
export class StatusCodeRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userLoader: UserLoader,
  ) {}
  /**
   * Field resolver / relation resolver for StatusCode.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("users")
  async users(@Parent() statusCode: PrismaStatusCode) {
    return this.userLoader.byStatusCodeId.load(statusCode.id);
  }
}
