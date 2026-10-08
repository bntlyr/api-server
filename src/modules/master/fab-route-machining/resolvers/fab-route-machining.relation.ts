import { MachineLoader } from "../../machine/machine.loader.js";
import { FabRouteStepLoader } from "../../fab-route-step/fab-route-step.loader.js";
import type { FabRouteMachining as PrismaFabRouteMachining } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("FabRouteMachining")
export class FabRouteMachiningRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fabRouteStepLoader: FabRouteStepLoader,
    private readonly machineLoader: MachineLoader,
  ) {}
  /**
   * Field resolver / relation resolver for FabRouteMachining.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("fabRouteStep")
  async fabRouteStep(@Parent() fabRouteMachining: PrismaFabRouteMachining) {
    if (!fabRouteMachining.fabRouteStepId) return null;
    return this.fabRouteStepLoader.byId.load(fabRouteMachining.fabRouteStepId);
  }

  @ResolveField("machine")
  async machine(@Parent() fabRouteMachining: PrismaFabRouteMachining) {
    if (!fabRouteMachining.machineId) return null;
    return this.machineLoader.byId.load(fabRouteMachining.machineId);
  }
}
