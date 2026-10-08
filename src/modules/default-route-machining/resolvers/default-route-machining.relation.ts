import { MachineLoader } from "../../machine/machine.loader.js";
import { DefaultRouteStepLoader } from "../../default-route-step/default-route-step.loader.js";
import type { DefaultRouteMachining as PrismaDefaultRouteMachining } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("DefaultRouteMachining")
export class DefaultRouteMachiningRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly defaultRouteStepLoader: DefaultRouteStepLoader,
    private readonly machineLoader: MachineLoader,
  ) {}
  /**
   * Field resolver / relation resolver for DefaultRouteMachining.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("defaultRouteStep")
  async defaultRouteStep(@Parent() defaultRouteMachining: PrismaDefaultRouteMachining) {
    if (!defaultRouteMachining.defaultRouteStepId) return null;
    return this.defaultRouteStepLoader.byId.load(defaultRouteMachining.defaultRouteStepId);
  }

  @ResolveField("machine")
  async machine(@Parent() defaultRouteMachining: PrismaDefaultRouteMachining) {
    if (!defaultRouteMachining.machineId) return null;
    return this.machineLoader.byId.load(defaultRouteMachining.machineId);
  }
}
