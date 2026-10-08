import { StatusCodeModule } from "./modules/status-code/status-code.module.js";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { Module } from "@nestjs/common";
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { PrismaModule } from "./prisma/index.js";
import { AuthModule } from "./auth/auth.module.js";
import { AuthService } from "./auth/services/auth.service.js";
import { NotificationModule } from "./notification/notification.module.js";
import { EventsModule } from "./events/events.module.js";
import { UserModule } from "./modules/user/user.module.js";
import { StorageModule } from "./storage/storage.module.js";
import { HealthModule } from "./health/health.module.js";
import { JavaServiceModule } from "./java-service/java-service.module.js";

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    JavaServiceModule,
    AuthModule,
    NotificationModule,
    EventsModule,
    UserModule,
    StorageModule,
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [AuthModule],
      inject: [AuthService],
      useFactory: (authService: AuthService) => ({
        typePaths: ["./**/*.graphql"],
        playground: false,
        plugins: [ApolloServerPluginLandingPageLocalDefault({ footer: false })],
        context: async ({ req, res }: { req: any; res: any }) => {
          let user = undefined;
          const authHeader = req.headers?.authorization;
          if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.substring(7);
            user = (await authService.validateUserFromToken(token)) ?? undefined;
          }
          req.user = user;
          return { req, res, user };
        },
      }),
    }),
      StatusCodeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
