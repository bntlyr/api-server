import { MachineLoader } from "../../machine/machine.loader.js";
import type { MachineType as PrismaMachineType } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("MachineType")
export class MachineTypeRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly machineLoader: MachineLoader,
  ) {}
  /**
   * Field resolver / relation resolver for MachineType.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("machines")
  async machines(@Parent() machineType: PrismaMachineType) {
    return this.machineLoader.byMachineTypeId.load(machineType.id);
  }
}
