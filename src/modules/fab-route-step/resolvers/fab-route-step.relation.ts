import { ProcessLoader } from "../../process/process.loader.js";
import { SectionLoader } from "../../section/section.loader.js";
import { FabRouteMachiningLoader } from "../../fab-route-machining/fab-route-machining.loader.js";
import { FabRouteIterationLoader } from "../../fab-route-iteration/fab-route-iteration.loader.js";
import { FabRouteParameterLoader } from "../../fab-route-parameter/fab-route-parameter.loader.js";
import { FabRouteLoader } from "../../fab-route/fab-route.loader.js";
import type { FabRouteStep as PrismaFabRouteStep } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("FabRouteStep")
export class FabRouteStepRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fabRouteLoader: FabRouteLoader,
    private readonly fabRouteParameterLoader: FabRouteParameterLoader,
    private readonly fabRouteIterationLoader: FabRouteIterationLoader,
    private readonly fabRouteMachiningLoader: FabRouteMachiningLoader,
    private readonly sectionLoader: SectionLoader,
    private readonly processLoader: ProcessLoader,
  ) {}
  /**
   * Field resolver / relation resolver for FabRouteStep.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("fabRoute")
  async fabRoute(@Parent() fabRouteStep: PrismaFabRouteStep) {
    if (!fabRouteStep.fabRouteId) return null;
    return this.fabRouteLoader.byId.load(fabRouteStep.fabRouteId);
  }

  @ResolveField("fabRouteParameters")
  async fabRouteParameters(@Parent() fabRouteStep: PrismaFabRouteStep) {
    return this.fabRouteParameterLoader.byFabRouteStepId.load(fabRouteStep.id);
  }

  @ResolveField("fabRouteIterations")
  async fabRouteIterations(@Parent() fabRouteStep: PrismaFabRouteStep) {
    return this.fabRouteIterationLoader.byFabRouteStepId.load(fabRouteStep.id);
  }

  @ResolveField("fabRouteMachinings")
  async fabRouteMachinings(@Parent() fabRouteStep: PrismaFabRouteStep) {
    return this.fabRouteMachiningLoader.byFabRouteStepId.load(fabRouteStep.id);
  }

  @ResolveField("section")
  async section(@Parent() fabRouteStep: PrismaFabRouteStep) {
    if (!fabRouteStep.sectionId) return null;
    return this.sectionLoader.byId.load(fabRouteStep.sectionId);
  }

  @ResolveField("process")
  async process(@Parent() fabRouteStep: PrismaFabRouteStep) {
    if (!fabRouteStep.processId) return null;
    return this.processLoader.byId.load(fabRouteStep.processId);
  }
}
