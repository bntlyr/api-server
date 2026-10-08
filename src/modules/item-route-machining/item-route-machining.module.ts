import { MachineLoader } from "../machine/machine.loader.js";
import { ItemRouteStepLoader } from "../item-route-step/item-route-step.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { ItemRouteMachiningService } from "./item-route-machining.service.js";
import { ItemRouteMachiningLoader } from "./item-route-machining.loader.js";
import { ItemRouteMachiningQueryResolver } from "./resolvers/item-route-machining.query.js";
import { ItemRouteMachiningMutationResolver } from "./resolvers/item-route-machining.mutation.js";
import { ItemRouteMachiningRelationResolver } from "./resolvers/item-route-machining.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    MachineLoader,
    ItemRouteStepLoader,
    ItemRouteMachiningLoader,
    ItemRouteMachiningService,
    ItemRouteMachiningQueryResolver,
    ItemRouteMachiningMutationResolver,
    ItemRouteMachiningRelationResolver,
  ],
  exports: [ItemRouteMachiningService, ItemRouteMachiningLoader],
})
export class ItemRouteMachiningModule {}
