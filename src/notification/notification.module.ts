import { Module, Global } from "@nestjs/common";
import { PrismaModule } from "../prisma/index.js";
import { AuthModule } from "../auth/auth.module.js";
import { NotificationService } from "./notification.service.js";
import { NotificationLoader } from "./notification.loader.js";
import {
  NotificationResolver,
  NotificationRecipientResolver,
} from "./notification.resolver.js";

@Global()
@Module({
  imports: [PrismaModule, AuthModule],
  providers: [
    NotificationService,
    NotificationLoader,
    NotificationResolver,
    NotificationRecipientResolver,
  ],
  exports: [NotificationService, NotificationLoader],
})
export class NotificationModule {}
