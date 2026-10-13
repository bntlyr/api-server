import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import type { Tool as PrismaTool } from "../../../../generated//prisma/client.js";
import { MachineToolLoader } from "../../machine-tool/machine-tool.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";

@Resolver("Tool")
export class ToolRelationResolver {
  constructor(
    private readonly machineToolLoader: MachineToolLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() tool: PrismaTool) {
    return resolveAuditEmployeeId(tool.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() tool: PrismaTool) {
    return resolveAuditEmployeeId(tool.updatedBy, this.userLoader);
  }

  @ResolveField("machineTools")
  async machineTools(@Parent() tool: PrismaTool) {
    return this.machineToolLoader.byToolId.load(tool.id);
  }
}
