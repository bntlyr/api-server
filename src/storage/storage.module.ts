import { Module, Global } from "@nestjs/common";
import { StorageService } from "./services/storage.service.js";
import { UploadService } from "./services/upload.service.js";
import { UploadController } from "./controllers/upload.controller.js";
import { StorageController } from "./controllers/storage.controller.js";
import { AuthModule } from "../auth/auth.module.js";

@Global()
@Module({
  imports: [AuthModule],
  controllers: [UploadController, StorageController],
  providers: [StorageService, UploadService],
  exports: [StorageService, UploadService],
})
export class StorageModule {}
