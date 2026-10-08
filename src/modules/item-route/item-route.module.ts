import { ItemRouteStepLoader } from "../item-route-step/item-route-step.loader.js";
import { ItemLoader } from "../item/item.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { ItemRouteService } from "./item-route.service.js";
import { ItemRouteLoader } from "./item-route.loader.js";
import { ItemRouteQueryResolver } from "./resolvers/item-route.query.js";
import { ItemRouteMutationResolver } from "./resolvers/item-route.mutation.js";
import { ItemRouteRelationResolver } from "./resolvers/item-route.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    ItemRouteStepLoader,
    ItemLoader,
    ItemRouteLoader,
    ItemRouteService,
    ItemRouteQueryResolver,
    ItemRouteMutationResolver,
    ItemRouteRelationResolver,
  ],
  exports: [ItemRouteService, ItemRouteLoader],
})
export class ItemRouteModule {}
