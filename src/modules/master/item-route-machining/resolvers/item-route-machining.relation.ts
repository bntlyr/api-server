import { MachineLoader } from "../../machine/machine.loader.js";
import { ItemRouteStepLoader } from "../../item-route-step/item-route-step.loader.js";
import type { ItemRouteMachining as PrismaItemRouteMachining } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("ItemRouteMachining")
export class ItemRouteMachiningRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemRouteStepLoader: ItemRouteStepLoader,
    private readonly machineLoader: MachineLoader,
  ) {}
  /**
   * Field resolver / relation resolver for ItemRouteMachining.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("itemRouteStep")
  async itemRouteStep(@Parent() itemRouteMachining: PrismaItemRouteMachining) {
    if (!itemRouteMachining.itemRouteStepId) return null;
    return this.itemRouteStepLoader.byId.load(itemRouteMachining.itemRouteStepId);
  }

  @ResolveField("machine")
  async machine(@Parent() itemRouteMachining: PrismaItemRouteMachining) {
    if (!itemRouteMachining.machineId) return null;
    return this.machineLoader.byId.load(itemRouteMachining.machineId);
  }
}
