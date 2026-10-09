import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { CastingDefectService } from "./casting-defect.service.js";
import { CastingDefectLoader } from "./casting-defect.loader.js";
import { CastingDefectQueryResolver } from "./resolvers/casting-defect.query.js";
import { CastingDefectMutationResolver } from "./resolvers/casting-defect.mutation.js";
import { CastingDefectRelationResolver } from "./resolvers/casting-defect.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    CastingDefectLoader,
    CastingDefectService,
    CastingDefectQueryResolver,
    CastingDefectMutationResolver,
    CastingDefectRelationResolver,
  ],
  exports: [CastingDefectService, CastingDefectLoader],
})
export class CastingDefectModule {}
