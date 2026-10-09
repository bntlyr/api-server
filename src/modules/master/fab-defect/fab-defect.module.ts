import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { FabDefectService } from "./fab-defect.service.js";
import { FabDefectLoader } from "./fab-defect.loader.js";
import { FabDefectQueryResolver } from "./resolvers/fab-defect.query.js";
import { FabDefectMutationResolver } from "./resolvers/fab-defect.mutation.js";
import { FabDefectRelationResolver } from "./resolvers/fab-defect.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    FabDefectLoader,
    FabDefectService,
    FabDefectQueryResolver,
    FabDefectMutationResolver,
    FabDefectRelationResolver,
  ],
  exports: [FabDefectService, FabDefectLoader],
})
export class FabDefectModule {}
