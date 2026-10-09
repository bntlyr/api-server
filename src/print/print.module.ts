import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/index.js";
import { JavaServiceModule } from "../java-service/java-service.module.js";
import { StorageModule } from "../storage/storage.module.js";
import { PrintService } from "./print.service.js";
import { PrintResolver } from "./print.resolver.js";
import { PrintController } from "./print.controller.js";

@Module({
  imports: [PrismaModule, JavaServiceModule, StorageModule],
  controllers: [PrintController],
  providers: [PrintService, PrintResolver],
  exports: [PrintService],
})
export class PrintModule {}
