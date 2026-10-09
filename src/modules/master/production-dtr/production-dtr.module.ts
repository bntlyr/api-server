import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { ProductionDtrService } from "./production-dtr.service.js";
import { ProductionDtrLoader } from "./production-dtr.loader.js";
import { ProductionDtrQueryResolver } from "./resolvers/production-dtr.query.js";
import { ProductionDtrMutationResolver } from "./resolvers/production-dtr.mutation.js";
import { ProductionDtrRelationResolver } from "./resolvers/production-dtr.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    ProductionDtrLoader,
    ProductionDtrService,
    ProductionDtrQueryResolver,
    ProductionDtrMutationResolver,
    ProductionDtrRelationResolver,
  ],
  exports: [ProductionDtrService, ProductionDtrLoader],
})
export class ProductionDtrModule {}
