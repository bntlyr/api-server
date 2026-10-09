import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { WaxDefectService } from "./wax-defect.service.js";
import { WaxDefectLoader } from "./wax-defect.loader.js";
import { WaxDefectQueryResolver } from "./resolvers/wax-defect.query.js";
import { WaxDefectMutationResolver } from "./resolvers/wax-defect.mutation.js";
import { WaxDefectRelationResolver } from "./resolvers/wax-defect.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    WaxDefectLoader,
    WaxDefectService,
    WaxDefectQueryResolver,
    WaxDefectMutationResolver,
    WaxDefectRelationResolver,
  ],
  exports: [WaxDefectService, WaxDefectLoader],
})
export class WaxDefectModule {}
