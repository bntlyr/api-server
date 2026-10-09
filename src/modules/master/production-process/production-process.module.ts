import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { ProductionProcessService } from "./production-process.service.js";
import { ProductionProcessLoader } from "./production-process.loader.js";
import { ProductionProcessQueryResolver } from "./resolvers/production-process.query.js";
import { ProductionProcessMutationResolver } from "./resolvers/production-process.mutation.js";
import { ProductionProcessRelationResolver } from "./resolvers/production-process.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    ProductionProcessLoader,
    ProductionProcessService,
    ProductionProcessQueryResolver,
    ProductionProcessMutationResolver,
    ProductionProcessRelationResolver,
  ],
  exports: [ProductionProcessService, ProductionProcessLoader],
})
export class ProductionProcessModule {}
