import { ItemRouteStepLoader } from "../../item-route-step/item-route-step.loader.js";
import { ItemLoader } from "../../item/item.loader.js";
import type { ItemRoute as PrismaItemRoute } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("ItemRoute")
export class ItemRouteRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemLoader: ItemLoader,
    private readonly itemRouteStepLoader: ItemRouteStepLoader,
  ) {}
  /**
   * Field resolver / relation resolver for ItemRoute.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("item")
  async item(@Parent() itemRoute: PrismaItemRoute) {
    if (!itemRoute.itemId) return null;
    return this.itemLoader.byId.load(itemRoute.itemId);
  }

  @ResolveField("itemRouteSteps")
  async itemRouteSteps(@Parent() itemRoute: PrismaItemRoute) {
    return this.itemRouteStepLoader.byItemRouteId.load(itemRoute.id);
  }
}
