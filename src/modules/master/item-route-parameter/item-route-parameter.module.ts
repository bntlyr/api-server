import { ItemRouteStepLoader } from "../item-route-step/item-route-step.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { ItemRouteParameterService } from "./item-route-parameter.service.js";
import { ItemRouteParameterLoader } from "./item-route-parameter.loader.js";
import { ItemRouteParameterQueryResolver } from "./resolvers/item-route-parameter.query.js";
import { ItemRouteParameterMutationResolver } from "./resolvers/item-route-parameter.mutation.js";
import { ItemRouteParameterRelationResolver } from "./resolvers/item-route-parameter.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    ItemRouteStepLoader,
    ItemRouteParameterLoader,
    ItemRouteParameterService,
    ItemRouteParameterQueryResolver,
    ItemRouteParameterMutationResolver,
    ItemRouteParameterRelationResolver,
  ],
  exports: [ItemRouteParameterService, ItemRouteParameterLoader],
})
export class ItemRouteParameterModule {}
