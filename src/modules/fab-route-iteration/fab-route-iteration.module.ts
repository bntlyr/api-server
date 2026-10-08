import { FabRouteStepLoader } from "../fab-route-step/fab-route-step.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { FabRouteIterationService } from "./fab-route-iteration.service.js";
import { FabRouteIterationLoader } from "./fab-route-iteration.loader.js";
import { FabRouteIterationQueryResolver } from "./resolvers/fab-route-iteration.query.js";
import { FabRouteIterationMutationResolver } from "./resolvers/fab-route-iteration.mutation.js";
import { FabRouteIterationRelationResolver } from "./resolvers/fab-route-iteration.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    FabRouteStepLoader,
    FabRouteIterationLoader,
    FabRouteIterationService,
    FabRouteIterationQueryResolver,
    FabRouteIterationMutationResolver,
    FabRouteIterationRelationResolver,
  ],
  exports: [FabRouteIterationService, FabRouteIterationLoader],
})
export class FabRouteIterationModule {}
