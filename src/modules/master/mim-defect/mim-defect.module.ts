import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { MimDefectService } from "./mim-defect.service.js";
import { MimDefectLoader } from "./mim-defect.loader.js";
import { MimDefectQueryResolver } from "./resolvers/mim-defect.query.js";
import { MimDefectMutationResolver } from "./resolvers/mim-defect.mutation.js";
import { MimDefectRelationResolver } from "./resolvers/mim-defect.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    MimDefectLoader,
    MimDefectService,
    MimDefectQueryResolver,
    MimDefectMutationResolver,
    MimDefectRelationResolver,
  ],
  exports: [MimDefectService, MimDefectLoader],
})
export class MimDefectModule {}
