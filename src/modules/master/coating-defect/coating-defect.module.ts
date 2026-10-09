import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { CoatingDefectService } from "./coating-defect.service.js";
import { CoatingDefectLoader } from "./coating-defect.loader.js";
import { CoatingDefectQueryResolver } from "./resolvers/coating-defect.query.js";
import { CoatingDefectMutationResolver } from "./resolvers/coating-defect.mutation.js";
import { CoatingDefectRelationResolver } from "./resolvers/coating-defect.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    CoatingDefectLoader,
    CoatingDefectService,
    CoatingDefectQueryResolver,
    CoatingDefectMutationResolver,
    CoatingDefectRelationResolver,
  ],
  exports: [CoatingDefectService, CoatingDefectLoader],
})
export class CoatingDefectModule {}
