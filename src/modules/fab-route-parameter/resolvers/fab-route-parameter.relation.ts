import { FabRouteStepLoader } from "../../fab-route-step/fab-route-step.loader.js";
import type { FabRouteParameter as PrismaFabRouteParameter } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("FabRouteParameter")
export class FabRouteParameterRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fabRouteStepLoader: FabRouteStepLoader,
  ) {}
  /**
   * Field resolver / relation resolver for FabRouteParameter.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("fabRouteStep")
  async fabRouteStep(@Parent() fabRouteParameter: PrismaFabRouteParameter) {
    if (!fabRouteParameter.fabRouteStepId) return null;
    return this.fabRouteStepLoader.byId.load(fabRouteParameter.fabRouteStepId);
  }
}
