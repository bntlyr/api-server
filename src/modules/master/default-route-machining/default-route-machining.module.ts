import { MachineLoader } from "../machine/machine.loader.js";
import { DefaultRouteStepLoader } from "../default-route-step/default-route-step.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { DefaultRouteMachiningService } from "./default-route-machining.service.js";
import { DefaultRouteMachiningLoader } from "./default-route-machining.loader.js";
import { DefaultRouteMachiningQueryResolver } from "./resolvers/default-route-machining.query.js";
import { DefaultRouteMachiningMutationResolver } from "./resolvers/default-route-machining.mutation.js";
import { DefaultRouteMachiningRelationResolver } from "./resolvers/default-route-machining.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    MachineLoader,
    DefaultRouteStepLoader,
    DefaultRouteMachiningLoader,
    DefaultRouteMachiningService,
    DefaultRouteMachiningQueryResolver,
    DefaultRouteMachiningMutationResolver,
    DefaultRouteMachiningRelationResolver,
  ],
  exports: [DefaultRouteMachiningService, DefaultRouteMachiningLoader],
})
export class DefaultRouteMachiningModule {}
