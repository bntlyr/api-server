import { DefaultRouteStepLoader } from "../default-route-step/default-route-step.loader.js";
import { ItemTypeLoader } from "../item-type/item-type.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { DefaultRouteService } from "./default-route.service.js";
import { DefaultRouteLoader } from "./default-route.loader.js";
import { DefaultRouteQueryResolver } from "./resolvers/default-route.query.js";
import { DefaultRouteMutationResolver } from "./resolvers/default-route.mutation.js";
import { DefaultRouteRelationResolver } from "./resolvers/default-route.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    DefaultRouteStepLoader,
    ItemTypeLoader,
    DefaultRouteLoader,
    DefaultRouteService,
    DefaultRouteQueryResolver,
    DefaultRouteMutationResolver,
    DefaultRouteRelationResolver,
  ],
  exports: [DefaultRouteService, DefaultRouteLoader],
})
export class DefaultRouteModule {}
