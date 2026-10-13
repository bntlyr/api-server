import { MachineToolLoader } from "../../machine-tool/machine-tool.loader.js";
import { FabRouteMachiningLoader } from "../../fab-route-machining/fab-route-machining.loader.js";
import { ItemRouteMachiningLoader } from "../../item-route-machining/item-route-machining.loader.js";
import { DefaultRouteMachiningLoader } from "../../default-route-machining/default-route-machining.loader.js";
import { ProcessMachiningLoader } from "../../process-machining/process-machining.loader.js";
import { SectionLoader } from "../../section/section.loader.js";
import { MachineTypeLoader } from "../../machine-type/machine-type.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";
import type { Machine as PrismaMachine } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("Machine")
export class MachineRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly machineTypeLoader: MachineTypeLoader,
    private readonly sectionLoader: SectionLoader,
    private readonly processMachiningLoader: ProcessMachiningLoader,
    private readonly defaultRouteMachiningLoader: DefaultRouteMachiningLoader,
    private readonly itemRouteMachiningLoader: ItemRouteMachiningLoader,
    private readonly fabRouteMachiningLoader: FabRouteMachiningLoader,
    private readonly machineToolLoader: MachineToolLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() machine: PrismaMachine) {
    return resolveAuditEmployeeId(machine.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() machine: PrismaMachine) {
    return resolveAuditEmployeeId(machine.updatedBy, this.userLoader);
  }

  @ResolveField("machineType")
  async machineType(@Parent() machine: PrismaMachine) {
    if (!machine.machineTypeId) return null;
    return this.machineTypeLoader.byId.load(machine.machineTypeId);
  }

  @ResolveField("section")
  async section(@Parent() machine: PrismaMachine) {
    if (!machine.sectionId) return null;
    return this.sectionLoader.byId.load(machine.sectionId);
  }

  @ResolveField("processMachinings")
  async processMachinings(@Parent() machine: PrismaMachine) {
    return this.processMachiningLoader.byMachineId.load(machine.id);
  }

  @ResolveField("defaultRouteMachinings")
  async defaultRouteMachinings(@Parent() machine: PrismaMachine) {
    return this.defaultRouteMachiningLoader.byMachineId.load(machine.id);
  }

  @ResolveField("itemRouteMachinings")
  async itemRouteMachinings(@Parent() machine: PrismaMachine) {
    return this.itemRouteMachiningLoader.byMachineId.load(machine.id);
  }

  @ResolveField("fabRouteMachinings")
  async fabRouteMachinings(@Parent() machine: PrismaMachine) {
    return this.fabRouteMachiningLoader.byMachineId.load(machine.id);
  }

  @ResolveField("machineTools")
  async machineTools(@Parent() machine: PrismaMachine) {
    return this.machineToolLoader.byMachineId.load(machine.id);
  }
}
