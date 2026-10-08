import { FabRouteStepLoader } from "../../fab-route-step/fab-route-step.loader.js";
import type { FabRouteIteration as PrismaFabRouteIteration } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("FabRouteIteration")
export class FabRouteIterationRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fabRouteStepLoader: FabRouteStepLoader,
  ) {}
  /**
   * Field resolver / relation resolver for FabRouteIteration.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("fabRouteStep")
  async fabRouteStep(@Parent() fabRouteIteration: PrismaFabRouteIteration) {
    if (!fabRouteIteration.fabRouteStepId) return null;
    return this.fabRouteStepLoader.byId.load(fabRouteIteration.fabRouteStepId);
  }
}
