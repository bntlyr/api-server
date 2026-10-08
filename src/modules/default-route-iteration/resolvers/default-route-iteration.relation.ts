import { DefaultRouteStepLoader } from "../../default-route-step/default-route-step.loader.js";
import type { DefaultRouteIteration as PrismaDefaultRouteIteration } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("DefaultRouteIteration")
export class DefaultRouteIterationRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly defaultRouteStepLoader: DefaultRouteStepLoader,
  ) {}
  /**
   * Field resolver / relation resolver for DefaultRouteIteration.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("defaultRouteStep")
  async defaultRouteStep(@Parent() defaultRouteIteration: PrismaDefaultRouteIteration) {
    if (!defaultRouteIteration.defaultRouteStepId) return null;
    return this.defaultRouteStepLoader.byId.load(defaultRouteIteration.defaultRouteStepId);
  }
}
