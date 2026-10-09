import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { ProductionExecutionService } from "./production-execution.service.js";
import { ProductionExecutionResolver } from "./resolvers/production-execution.resolver.js";

@Module({
  imports: [PrismaModule],
  providers: [ProductionExecutionService, ProductionExecutionResolver],
  exports: [ProductionExecutionService],
})
export class ProductionExecutionModule {}
