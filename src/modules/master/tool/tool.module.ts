import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { ToolService } from "./tool.service.js";
import { ToolLoader } from "./tool.loader.js";
import { ToolQueryResolver } from "./resolvers/tool.query.js";
import { ToolMutationResolver } from "./resolvers/tool.mutation.js";
import { ToolRelationResolver } from "./resolvers/tool.relation.js";

import { MachineToolLoader } from "../machine-tool/machine-tool.loader.js";

@Module({
  imports: [PrismaModule],
  providers: [
    MachineToolLoader,
    ToolLoader,
    ToolService,
    ToolQueryResolver,
    ToolMutationResolver,
    ToolRelationResolver,
  ],
  exports: [ToolService, ToolLoader],
})
export class ToolModule {}
