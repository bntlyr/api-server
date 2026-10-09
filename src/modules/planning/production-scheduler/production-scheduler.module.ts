import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { JavaServiceModule } from "../../../java-service/java-service.module.js";
import { ProductionSchedulerService } from "./production-scheduler.service.js";
import { ProductionSchedulerResolver } from "./resolvers/production-scheduler.resolver.js";

@Module({
  imports: [PrismaModule, JavaServiceModule],
  providers: [ProductionSchedulerService, ProductionSchedulerResolver],
  exports: [ProductionSchedulerService],
})
export class ProductionSchedulerModule {}
