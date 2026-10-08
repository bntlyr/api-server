import { FabRouteStepLoader } from "../../fab-route-step/fab-route-step.loader.js";
import { FabricationLoader } from "../../fabrication/fabrication.loader.js";
import type { FabRoute as PrismaFabRoute } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("FabRoute")
export class FabRouteRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fabricationLoader: FabricationLoader,
    private readonly fabRouteStepLoader: FabRouteStepLoader,
  ) {}
  /**
   * Field resolver / relation resolver for FabRoute.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("fabrication")
  async fabrication(@Parent() fabRoute: PrismaFabRoute) {
    if (!fabRoute.fabricationId) return null;
    return this.fabricationLoader.byId.load(fabRoute.fabricationId);
  }

  @ResolveField("fabRouteSteps")
  async fabRouteSteps(@Parent() fabRoute: PrismaFabRoute) {
    return this.fabRouteStepLoader.byFabRouteId.load(fabRoute.id);
  }
}
