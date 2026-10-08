import { DefaultRouteStepLoader } from "../../default-route-step/default-route-step.loader.js";
import { ItemTypeLoader } from "../../item-type/item-type.loader.js";
import type { DefaultRoute as PrismaDefaultRoute } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("DefaultRoute")
export class DefaultRouteRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemTypeLoader: ItemTypeLoader,
    private readonly defaultRouteStepLoader: DefaultRouteStepLoader,
  ) {}
  /**
   * Field resolver / relation resolver for DefaultRoute.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("itemType")
  async itemType(@Parent() defaultRoute: PrismaDefaultRoute) {
    if (!defaultRoute.itemTypeId) return null;
    return this.itemTypeLoader.byId.load(defaultRoute.itemTypeId);
  }

  @ResolveField("defaultRouteSteps")
  async defaultRouteSteps(@Parent() defaultRoute: PrismaDefaultRoute) {
    return this.defaultRouteStepLoader.byDefaultRouteId.load(defaultRoute.id);
  }
}
