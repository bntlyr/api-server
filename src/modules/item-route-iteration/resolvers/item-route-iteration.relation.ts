import { ItemRouteStepLoader } from "../../item-route-step/item-route-step.loader.js";
import type { ItemRouteIteration as PrismaItemRouteIteration } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("ItemRouteIteration")
export class ItemRouteIterationRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemRouteStepLoader: ItemRouteStepLoader,
  ) {}
  /**
   * Field resolver / relation resolver for ItemRouteIteration.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("itemRouteStep")
  async itemRouteStep(@Parent() itemRouteIteration: PrismaItemRouteIteration) {
    if (!itemRouteIteration.itemRouteStepId) return null;
    return this.itemRouteStepLoader.byId.load(itemRouteIteration.itemRouteStepId);
  }
}
