import { ItemRouteStepLoader } from "../item-route-step/item-route-step.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { ItemRouteIterationService } from "./item-route-iteration.service.js";
import { ItemRouteIterationLoader } from "./item-route-iteration.loader.js";
import { ItemRouteIterationQueryResolver } from "./resolvers/item-route-iteration.query.js";
import { ItemRouteIterationMutationResolver } from "./resolvers/item-route-iteration.mutation.js";
import { ItemRouteIterationRelationResolver } from "./resolvers/item-route-iteration.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    ItemRouteStepLoader,
    ItemRouteIterationLoader,
    ItemRouteIterationService,
    ItemRouteIterationQueryResolver,
    ItemRouteIterationMutationResolver,
    ItemRouteIterationRelationResolver,
  ],
  exports: [ItemRouteIterationService, ItemRouteIterationLoader],
})
export class ItemRouteIterationModule {}
