import { ProcessLoader } from "../../process/process.loader.js";
import { SectionLoader } from "../../section/section.loader.js";
import { ItemRouteMachiningLoader } from "../../item-route-machining/item-route-machining.loader.js";
import { ItemRouteIterationLoader } from "../../item-route-iteration/item-route-iteration.loader.js";
import { ItemRouteParameterLoader } from "../../item-route-parameter/item-route-parameter.loader.js";
import { ItemRouteLoader } from "../../item-route/item-route.loader.js";
import type { ItemRouteStep as PrismaItemRouteStep } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("ItemRouteStep")
export class ItemRouteStepRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemRouteLoader: ItemRouteLoader,
    private readonly itemRouteParameterLoader: ItemRouteParameterLoader,
    private readonly itemRouteIterationLoader: ItemRouteIterationLoader,
    private readonly itemRouteMachiningLoader: ItemRouteMachiningLoader,
    private readonly sectionLoader: SectionLoader,
    private readonly processLoader: ProcessLoader,
  ) {}
  /**
   * Field resolver / relation resolver for ItemRouteStep.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("itemRoute")
  async itemRoute(@Parent() itemRouteStep: PrismaItemRouteStep) {
    if (!itemRouteStep.itemRouteId) return null;
    return this.itemRouteLoader.byId.load(itemRouteStep.itemRouteId);
  }

  @ResolveField("itemRouteParameters")
  async itemRouteParameters(@Parent() itemRouteStep: PrismaItemRouteStep) {
    return this.itemRouteParameterLoader.byItemRouteStepId.load(itemRouteStep.id);
  }

  @ResolveField("itemRouteIterations")
  async itemRouteIterations(@Parent() itemRouteStep: PrismaItemRouteStep) {
    return this.itemRouteIterationLoader.byItemRouteStepId.load(itemRouteStep.id);
  }

  @ResolveField("itemRouteMachinings")
  async itemRouteMachinings(@Parent() itemRouteStep: PrismaItemRouteStep) {
    return this.itemRouteMachiningLoader.byItemRouteStepId.load(itemRouteStep.id);
  }

  @ResolveField("section")
  async section(@Parent() itemRouteStep: PrismaItemRouteStep) {
    if (!itemRouteStep.sectionId) return null;
    return this.sectionLoader.byId.load(itemRouteStep.sectionId);
  }

  @ResolveField("process")
  async process(@Parent() itemRouteStep: PrismaItemRouteStep) {
    if (!itemRouteStep.processId) return null;
    return this.processLoader.byId.load(itemRouteStep.processId);
  }
}
