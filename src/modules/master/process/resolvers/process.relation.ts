import { FabRouteStepLoader } from "../../fab-route-step/fab-route-step.loader.js";
import { ItemRouteStepLoader } from "../../item-route-step/item-route-step.loader.js";
import { DefaultRouteStepLoader } from "../../default-route-step/default-route-step.loader.js";
import { ProcessMachiningLoader } from "../../process-machining/process-machining.loader.js";
import { ProcessIterationLoader } from "../../process-iteration/process-iteration.loader.js";
import { ItemPictureLoader } from "../../item-picture/item-picture.loader.js";
import { ParameterLoader } from "../../parameter/parameter.loader.js";
import { SectionLoader } from "../../section/section.loader.js";
import type { Process as PrismaProcess } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("Process")
export class ProcessRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sectionLoader: SectionLoader,
    private readonly parameterLoader: ParameterLoader,
    private readonly itemPictureLoader: ItemPictureLoader,
    private readonly processIterationLoader: ProcessIterationLoader,
    private readonly processMachiningLoader: ProcessMachiningLoader,
    private readonly defaultRouteStepLoader: DefaultRouteStepLoader,
    private readonly itemRouteStepLoader: ItemRouteStepLoader,
    private readonly fabRouteStepLoader: FabRouteStepLoader,
  ) {}
  /**
   * Field resolver / relation resolver for Process.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("section")
  async section(@Parent() process: PrismaProcess) {
    if (!process.sectionId) return null;
    return this.sectionLoader.byId.load(process.sectionId);
  }

  @ResolveField("parameters")
  async parameters(@Parent() process: PrismaProcess) {
    return this.parameterLoader.byProcessId.load(process.id);
  }

  @ResolveField("itemPictures")
  async itemPictures(@Parent() process: PrismaProcess) {
    return this.itemPictureLoader.byProcessId.load(process.id);
  }

  @ResolveField("processIterations")
  async processIterations(@Parent() process: PrismaProcess) {
    return this.processIterationLoader.byProcessId.load(process.id);
  }

  @ResolveField("processMachinings")
  async processMachinings(@Parent() process: PrismaProcess) {
    return this.processMachiningLoader.byProcessId.load(process.id);
  }

  @ResolveField("defaultRouteSteps")
  async defaultRouteSteps(@Parent() process: PrismaProcess) {
    return this.defaultRouteStepLoader.byProcessId.load(process.id);
  }

  @ResolveField("itemRouteSteps")
  async itemRouteSteps(@Parent() process: PrismaProcess) {
    return this.itemRouteStepLoader.byProcessId.load(process.id);
  }

  @ResolveField("fabRouteSteps")
  async fabRouteSteps(@Parent() process: PrismaProcess) {
    return this.fabRouteStepLoader.byProcessId.load(process.id);
  }
}
