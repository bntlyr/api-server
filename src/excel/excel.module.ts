import { Module, Global } from "@nestjs/common";
import { ExcelService } from "./excel.service.js";
import { ExcelResolver } from "./excel.resolver.js";
import { ExcelController } from "./excel.controller.js";
import { StorageModule } from "../storage/storage.module.js";
import { PrismaModule } from "../prisma/index.js";
import { AuthModule } from "../auth/auth.module.js";

@Global()
@Module({
  imports: [StorageModule, PrismaModule, AuthModule],
  controllers: [ExcelController],
  providers: [ExcelService, ExcelResolver],
  exports: [ExcelService],
})
export class ExcelModule {}
