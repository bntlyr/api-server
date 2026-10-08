import { Module, Global } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { EventsGateway } from "./gateways/events.gateway.js";
import { PgListenerService } from "./services/pg-listener.service.js";

@Global()
@Module({
  imports: [AuthModule],
  providers: [EventsGateway, PgListenerService],
  exports: [EventsGateway, PgListenerService],
})
export class EventsModule {}
