import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import type { Tool as PrismaTool } from "../../../generated/prisma/client.js";
import { MachineToolLoader } from "../../machine-tool/machine-tool.loader.js";

@Resolver("Tool")
export class ToolRelationResolver {
  constructor(private readonly machineToolLoader: MachineToolLoader) {}

  @ResolveField("machineTools")
  async machineTools(@Parent() tool: PrismaTool) {
    return this.machineToolLoader.byToolId.load(tool.id);
  }
}
