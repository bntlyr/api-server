import { MachineLoader } from "../../machine/machine.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import type { MachineType as PrismaMachineType } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";

@Resolver("MachineType")
export class MachineTypeRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly machineLoader: MachineLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() machineType: PrismaMachineType) {
    return resolveAuditEmployeeId(machineType.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() machineType: PrismaMachineType) {
    return resolveAuditEmployeeId(machineType.updatedBy, this.userLoader);
  }

  @ResolveField("machines")
  async machines(@Parent() machineType: PrismaMachineType) {
    return this.machineLoader.byMachineTypeId.load(machineType.id);
  }
}
