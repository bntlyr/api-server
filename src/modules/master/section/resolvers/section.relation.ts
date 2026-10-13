import { FabRouteStepLoader } from "../../fab-route-step/fab-route-step.loader.js";
import { ItemRouteStepLoader } from "../../item-route-step/item-route-step.loader.js";
import { DefaultRouteStepLoader } from "../../default-route-step/default-route-step.loader.js";
import { ProcessLoader } from "../../process/process.loader.js";
import { MaterialLoader } from "../../material/material.loader.js";
import { MachineLoader } from "../../machine/machine.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import { PositionLoader } from "../../position/position.loader.js";
import type { Section as PrismaSection } from "../../../../generated/prisma/client.js";
import { PrismaService } from "../../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";

@Resolver("Section")
export class SectionRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly positionLoader: PositionLoader,
    private readonly userLoader: UserLoader,
    private readonly machineLoader: MachineLoader,
    private readonly materialLoader: MaterialLoader,
    private readonly processLoader: ProcessLoader,
    private readonly defaultRouteStepLoader: DefaultRouteStepLoader,
    private readonly itemRouteStepLoader: ItemRouteStepLoader,
    private readonly fabRouteStepLoader: FabRouteStepLoader,
  ) {}
  /**
   * Field resolver / relation resolver for Section.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("createdBy")
  async createdBy(@Parent() section: PrismaSection) {
    return resolveAuditEmployeeId(section.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() section: PrismaSection) {
    return resolveAuditEmployeeId(section.updatedBy, this.userLoader);
  }

  @ResolveField("positions")
  async positions(@Parent() section: PrismaSection) {
    return this.positionLoader.bySectionId.load(section.id);
  }

  @ResolveField("users")
  async users(@Parent() section: PrismaSection) {
    return this.userLoader.bySectionId.load(section.id);
  }

  @ResolveField("machines")
  async machines(@Parent() section: PrismaSection) {
    return this.machineLoader.bySectionId.load(section.id);
  }

  @ResolveField("materials")
  async materials(@Parent() section: PrismaSection) {
    return this.materialLoader.bySectionId.load(section.id);
  }

  @ResolveField("processes")
  async processes(@Parent() section: PrismaSection) {
    return this.processLoader.bySectionId.load(section.id);
  }

  @ResolveField("defaultRouteSteps")
  async defaultRouteSteps(@Parent() section: PrismaSection) {
    return this.defaultRouteStepLoader.bySectionId.load(section.id);
  }

  @ResolveField("itemRouteSteps")
  async itemRouteSteps(@Parent() section: PrismaSection) {
    return this.itemRouteStepLoader.bySectionId.load(section.id);
  }

  @ResolveField("fabRouteSteps")
  async fabRouteSteps(@Parent() section: PrismaSection) {
    return this.fabRouteStepLoader.bySectionId.load(section.id);
  }
}
