import { FabRouteLoader } from "../../fab-route/fab-route.loader.js";
import { ItemLoader } from "../../item/item.loader.js";
import type { Fabrication as PrismaFabrication } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("Fabrication")
export class FabricationRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemLoader: ItemLoader,
    private readonly fabRouteLoader: FabRouteLoader,
  ) {}
  /**
   * Field resolver / relation resolver for Fabrication.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("item")
  async item(@Parent() fabrication: PrismaFabrication) {
    if (!fabrication.itemId) return null;
    return this.itemLoader.byId.load(fabrication.itemId);
  }

  @ResolveField("fabRoutes")
  async fabRoutes(@Parent() fabrication: PrismaFabrication) {
    return this.fabRouteLoader.byFabricationId.load(fabrication.id);
  }
}
