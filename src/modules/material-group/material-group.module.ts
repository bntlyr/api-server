import { MaterialLoader } from "../material/material.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { MaterialGroupService } from "./material-group.service.js";
import { MaterialGroupLoader } from "./material-group.loader.js";
import { MaterialGroupQueryResolver } from "./resolvers/material-group.query.js";
import { MaterialGroupMutationResolver } from "./resolvers/material-group.mutation.js";
import { MaterialGroupRelationResolver } from "./resolvers/material-group.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    MaterialLoader,
    MaterialGroupLoader,
    MaterialGroupService,
    MaterialGroupQueryResolver,
    MaterialGroupMutationResolver,
    MaterialGroupRelationResolver,
  ],
  exports: [MaterialGroupService, MaterialGroupLoader],
})
export class MaterialGroupModule {}
