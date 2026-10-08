import { ProcessLoader } from "../process/process.loader.js";
import { SectionLoader } from "../section/section.loader.js";
import { ItemRouteMachiningLoader } from "../item-route-machining/item-route-machining.loader.js";
import { ItemRouteIterationLoader } from "../item-route-iteration/item-route-iteration.loader.js";
import { ItemRouteParameterLoader } from "../item-route-parameter/item-route-parameter.loader.js";
import { ItemRouteLoader } from "../item-route/item-route.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { ItemRouteStepService } from "./item-route-step.service.js";
import { ItemRouteStepLoader } from "./item-route-step.loader.js";
import { ItemRouteStepQueryResolver } from "./resolvers/item-route-step.query.js";
import { ItemRouteStepMutationResolver } from "./resolvers/item-route-step.mutation.js";
import { ItemRouteStepRelationResolver } from "./resolvers/item-route-step.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    ProcessLoader,
    SectionLoader,
    ItemRouteMachiningLoader,
    ItemRouteIterationLoader,
    ItemRouteParameterLoader,
    ItemRouteLoader,
    ItemRouteStepLoader,
    ItemRouteStepService,
    ItemRouteStepQueryResolver,
    ItemRouteStepMutationResolver,
    ItemRouteStepRelationResolver,
  ],
  exports: [ItemRouteStepService, ItemRouteStepLoader],
})
export class ItemRouteStepModule {}
