import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import type { MachineTool as PrismaMachineTool } from "../../../../generated//prisma/client.js";
import { MachineLoader } from "../../machine/machine.loader.js";
import { ToolLoader } from "../../tool/tool.loader.js";

import { UserLoader } from "../../../user/user.loader.js";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";

@Resolver("MachineTool")
export class MachineToolRelationResolver {
  constructor(
    private readonly machineLoader: MachineLoader,
    private readonly toolLoader: ToolLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() machineTool: PrismaMachineTool) {
    return resolveAuditEmployeeId(machineTool.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() machineTool: PrismaMachineTool) {
    return resolveAuditEmployeeId(machineTool.updatedBy, this.userLoader);
  }

  @ResolveField("machine")
  async machine(@Parent() machineTool: PrismaMachineTool) {
    if (!machineTool.machineId) return null;
    return this.machineLoader.byId.load(machineTool.machineId);
  }

  @ResolveField("tool")
  async tool(@Parent() machineTool: PrismaMachineTool) {
    if (!machineTool.toolId) return null;
    return this.toolLoader.byId.load(machineTool.toolId);
  }
}
