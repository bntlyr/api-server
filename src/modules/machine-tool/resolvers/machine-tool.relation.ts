import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import type { MachineTool as PrismaMachineTool } from "../../../generated/prisma/client.js";
import { MachineLoader } from "../../machine/machine.loader.js";
import { ToolLoader } from "../../tool/tool.loader.js";

@Resolver("MachineTool")
export class MachineToolRelationResolver {
  constructor(
    private readonly machineLoader: MachineLoader,
    private readonly toolLoader: ToolLoader,
  ) {}

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
