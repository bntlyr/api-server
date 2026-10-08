import { Module } from "@nestjs/common";
import { JavaService } from "./java-service.service.js";

@Module({
  providers: [JavaService],
  exports: [JavaService],
})
export class JavaServiceModule {}
