import { MachineLoader } from "../../machine/machine.loader.js";
import { ProcessLoader } from "../../process/process.loader.js";
import type { ProcessMachining as PrismaProcessMachining } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("ProcessMachining")
export class ProcessMachiningRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly processLoader: ProcessLoader,
    private readonly machineLoader: MachineLoader,
  ) {}
  /**
   * Field resolver / relation resolver for ProcessMachining.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("process")
  async process(@Parent() processMachining: PrismaProcessMachining) {
    if (!processMachining.processId) return null;
    return this.processLoader.byId.load(processMachining.processId);
  }

  @ResolveField("machine")
  async machine(@Parent() processMachining: PrismaProcessMachining) {
    if (!processMachining.machineId) return null;
    return this.machineLoader.byId.load(processMachining.machineId);
  }
}
