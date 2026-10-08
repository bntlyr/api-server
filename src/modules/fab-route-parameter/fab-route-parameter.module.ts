import { FabRouteStepLoader } from "../fab-route-step/fab-route-step.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { FabRouteParameterService } from "./fab-route-parameter.service.js";
import { FabRouteParameterLoader } from "./fab-route-parameter.loader.js";
import { FabRouteParameterQueryResolver } from "./resolvers/fab-route-parameter.query.js";
import { FabRouteParameterMutationResolver } from "./resolvers/fab-route-parameter.mutation.js";
import { FabRouteParameterRelationResolver } from "./resolvers/fab-route-parameter.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    FabRouteStepLoader,
    FabRouteParameterLoader,
    FabRouteParameterService,
    FabRouteParameterQueryResolver,
    FabRouteParameterMutationResolver,
    FabRouteParameterRelationResolver,
  ],
  exports: [FabRouteParameterService, FabRouteParameterLoader],
})
export class FabRouteParameterModule {}
