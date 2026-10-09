import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { ProductionSlipService } from "./production-slip.service.js";
import { ProductionSlipLoader } from "./production-slip.loader.js";
import { ProductionSlipQueryResolver } from "./resolvers/production-slip.query.js";
import { ProductionSlipMutationResolver } from "./resolvers/production-slip.mutation.js";
import { ProductionSlipRelationResolver } from "./resolvers/production-slip.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    ProductionSlipLoader,
    ProductionSlipService,
    ProductionSlipQueryResolver,
    ProductionSlipMutationResolver,
    ProductionSlipRelationResolver,
  ],
  exports: [ProductionSlipService, ProductionSlipLoader],
})
export class ProductionSlipModule {}
