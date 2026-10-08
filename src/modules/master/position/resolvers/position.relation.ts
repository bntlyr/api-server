import { UserLoader } from "../../../user/user.loader.js";
import { SectionLoader } from "../../section/section.loader.js";
import type { Position as PrismaPosition } from "../../../../generated/prisma/client.js";
import { PrismaService } from "../../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("Position")
export class PositionRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sectionLoader: SectionLoader,
    private readonly userLoader: UserLoader,
  ) {}
  /**
   * Field resolver / relation resolver for Position.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("section")
  async section(@Parent() position: PrismaPosition) {
    if (!position.sectionId) return null;
    return this.sectionLoader.byId.load(position.sectionId);
  }

  @ResolveField("users")
  async users(@Parent() position: PrismaPosition) {
    return this.userLoader.byPositionId.load(position.id);
  }
}
