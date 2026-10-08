import { LocationLoader } from "../../location/location.loader.js";
import type { Area as PrismaArea } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("Area")
export class AreaRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationLoader: LocationLoader,
  ) {}
  /**
   * Field resolver / relation resolver for Area.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("locations")
  async locations(@Parent() area: PrismaArea) {
    return this.locationLoader.byAreaId.load(area.id);
  }
}
