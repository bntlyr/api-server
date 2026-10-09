import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { PrefinDefectService } from "./prefin-defect.service.js";
import { PrefinDefectLoader } from "./prefin-defect.loader.js";
import { PrefinDefectQueryResolver } from "./resolvers/prefin-defect.query.js";
import { PrefinDefectMutationResolver } from "./resolvers/prefin-defect.mutation.js";
import { PrefinDefectRelationResolver } from "./resolvers/prefin-defect.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    PrefinDefectLoader,
    PrefinDefectService,
    PrefinDefectQueryResolver,
    PrefinDefectMutationResolver,
    PrefinDefectRelationResolver,
  ],
  exports: [PrefinDefectService, PrefinDefectLoader],
})
export class PrefinDefectModule {}
