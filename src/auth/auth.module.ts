import { Module, Global } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { PrismaModule } from "../prisma/index.js";
import { TokenService } from "./services/token.service.js";
import { AuditTrailService } from "./services/audit-trail.service.js";
import { AuthService } from "./services/auth.service.js";
import { AuthResolver } from "./auth.resolver.js";
import { AuthController } from "./controllers/auth.controller.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { PagePermissionGuard } from "./guards/page-permission.guard.js";

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    TokenService,
    AuditTrailService,
    AuthService,
    AuthResolver,
    JwtAuthGuard,
    PagePermissionGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [
    TokenService,
    AuditTrailService,
    AuthService,
    JwtAuthGuard,
    PagePermissionGuard,
  ],
})
export class AuthModule {}

