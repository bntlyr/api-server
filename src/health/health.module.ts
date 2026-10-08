import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/index.js";
import { JavaServiceModule } from "../java-service/java-service.module.js";
import { HealthController } from "./health.controller.js";
import { HealthService } from "./health.service.js";

@Module({
  imports: [PrismaModule, JavaServiceModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
