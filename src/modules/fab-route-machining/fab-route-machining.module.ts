import { MachineLoader } from "../machine/machine.loader.js";
import { FabRouteStepLoader } from "../fab-route-step/fab-route-step.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { FabRouteMachiningService } from "./fab-route-machining.service.js";
import { FabRouteMachiningLoader } from "./fab-route-machining.loader.js";
import { FabRouteMachiningQueryResolver } from "./resolvers/fab-route-machining.query.js";
import { FabRouteMachiningMutationResolver } from "./resolvers/fab-route-machining.mutation.js";
import { FabRouteMachiningRelationResolver } from "./resolvers/fab-route-machining.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    MachineLoader,
    FabRouteStepLoader,
    FabRouteMachiningLoader,
    FabRouteMachiningService,
    FabRouteMachiningQueryResolver,
    FabRouteMachiningMutationResolver,
    FabRouteMachiningRelationResolver,
  ],
  exports: [FabRouteMachiningService, FabRouteMachiningLoader],
})
export class FabRouteMachiningModule {}
