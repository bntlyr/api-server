import { PositionLoader } from "../../master/position/position.loader.js";
import { SectionLoader } from "../../master/section/section.loader.js";
import { StatusCodeLoader } from "../../common/status-code/status-code.loader.js";
import type { User as PrismaUser } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver('User')
export class UserRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly statusCodeLoader: StatusCodeLoader,
    private readonly sectionLoader: SectionLoader,
    private readonly positionLoader: PositionLoader,
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

  @ResolveField("section")
  async section(@Parent() user: PrismaUser) {
    if (!user.sectionId) return null;
    return this.sectionLoader.byId.load(user.sectionId);
  }

  @ResolveField("position")
  async position(@Parent() user: PrismaUser) {
    if (!user.positionId) return null;
    return this.positionLoader.byId.load(user.positionId);
  }
}
