import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { MachineToolService } from "./machine-tool.service.js";
import { MachineToolLoader } from "./machine-tool.loader.js";
import { MachineToolQueryResolver } from "./resolvers/machine-tool.query.js";
import { MachineToolMutationResolver } from "./resolvers/machine-tool.mutation.js";
import { MachineToolRelationResolver } from "./resolvers/machine-tool.relation.js";

import { UserLoader } from "../../user/user.loader.js";
import { MachineModule } from "../machine/machine.module.js";
import { ToolModule } from "../tool/tool.module.js";

@Module({
  imports: [PrismaModule, MachineModule, ToolModule],
  providers: [
    UserLoader,
    MachineToolLoader,
    MachineToolService,
    MachineToolQueryResolver,
    MachineToolMutationResolver,
    MachineToolRelationResolver,
  ],
  exports: [MachineToolService, MachineToolLoader],
})
export class MachineToolModule {}
