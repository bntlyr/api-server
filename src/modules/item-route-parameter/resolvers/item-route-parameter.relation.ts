import { ItemRouteStepLoader } from "../../item-route-step/item-route-step.loader.js";
import type { ItemRouteParameter as PrismaItemRouteParameter } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("ItemRouteParameter")
export class ItemRouteParameterRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemRouteStepLoader: ItemRouteStepLoader,
  ) {}
  /**
   * Field resolver / relation resolver for ItemRouteParameter.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("itemRouteStep")
  async itemRouteStep(@Parent() itemRouteParameter: PrismaItemRouteParameter) {
    if (!itemRouteParameter.itemRouteStepId) return null;
    return this.itemRouteStepLoader.byId.load(itemRouteParameter.itemRouteStepId);
  }
}
