import { FabRouteStepLoader } from "../fab-route-step/fab-route-step.loader.js";
import { FabricationLoader } from "../fabrication/fabrication.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { FabRouteService } from "./fab-route.service.js";
import { FabRouteLoader } from "./fab-route.loader.js";
import { FabRouteQueryResolver } from "./resolvers/fab-route.query.js";
import { FabRouteMutationResolver } from "./resolvers/fab-route.mutation.js";
import { FabRouteRelationResolver } from "./resolvers/fab-route.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    FabRouteStepLoader,
    FabricationLoader,
    FabRouteLoader,
    FabRouteService,
    FabRouteQueryResolver,
    FabRouteMutationResolver,
    FabRouteRelationResolver,
  ],
  exports: [FabRouteService, FabRouteLoader],
})
export class FabRouteModule {}
