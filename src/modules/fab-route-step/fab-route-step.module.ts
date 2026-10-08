import { ProcessLoader } from "../process/process.loader.js";
import { SectionLoader } from "../section/section.loader.js";
import { FabRouteMachiningLoader } from "../fab-route-machining/fab-route-machining.loader.js";
import { FabRouteIterationLoader } from "../fab-route-iteration/fab-route-iteration.loader.js";
import { FabRouteParameterLoader } from "../fab-route-parameter/fab-route-parameter.loader.js";
import { FabRouteLoader } from "../fab-route/fab-route.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { FabRouteStepService } from "./fab-route-step.service.js";
import { FabRouteStepLoader } from "./fab-route-step.loader.js";
import { FabRouteStepQueryResolver } from "./resolvers/fab-route-step.query.js";
import { FabRouteStepMutationResolver } from "./resolvers/fab-route-step.mutation.js";
import { FabRouteStepRelationResolver } from "./resolvers/fab-route-step.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    ProcessLoader,
    SectionLoader,
    FabRouteMachiningLoader,
    FabRouteIterationLoader,
    FabRouteParameterLoader,
    FabRouteLoader,
    FabRouteStepLoader,
    FabRouteStepService,
    FabRouteStepQueryResolver,
    FabRouteStepMutationResolver,
    FabRouteStepRelationResolver,
  ],
  exports: [FabRouteStepService, FabRouteStepLoader],
})
export class FabRouteStepModule {}
