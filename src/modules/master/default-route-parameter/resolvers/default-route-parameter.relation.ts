import { DefaultRouteStepLoader } from "../../default-route-step/default-route-step.loader.js";
import type { DefaultRouteParameter as PrismaDefaultRouteParameter } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("DefaultRouteParameter")
export class DefaultRouteParameterRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly defaultRouteStepLoader: DefaultRouteStepLoader,
  ) {}
  /**
   * Field resolver / relation resolver for DefaultRouteParameter.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("defaultRouteStep")
  async defaultRouteStep(@Parent() defaultRouteParameter: PrismaDefaultRouteParameter) {
    if (!defaultRouteParameter.defaultRouteStepId) return null;
    return this.defaultRouteStepLoader.byId.load(defaultRouteParameter.defaultRouteStepId);
  }
}
