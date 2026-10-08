import { AreaLoader } from "../../area/area.loader.js";
import type { Location as PrismaLocation } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("Location")
export class LocationRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly areaLoader: AreaLoader,
  ) {}
  /**
   * Field resolver / relation resolver for Location.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("area")
  async area(@Parent() location: PrismaLocation) {
    if (!location.areaId) return null;
    return this.areaLoader.byId.load(location.areaId);
  }
}
