import { ProcessLoader } from "../process/process.loader.js";
import { SectionLoader } from "../section/section.loader.js";
import { DefaultRouteMachiningLoader } from "../default-route-machining/default-route-machining.loader.js";
import { DefaultRouteIterationLoader } from "../default-route-iteration/default-route-iteration.loader.js";
import { DefaultRouteParameterLoader } from "../default-route-parameter/default-route-parameter.loader.js";
import { DefaultRouteLoader } from "../default-route/default-route.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { DefaultRouteStepService } from "./default-route-step.service.js";
import { DefaultRouteStepLoader } from "./default-route-step.loader.js";
import { DefaultRouteStepQueryResolver } from "./resolvers/default-route-step.query.js";
import { DefaultRouteStepMutationResolver } from "./resolvers/default-route-step.mutation.js";
import { DefaultRouteStepRelationResolver } from "./resolvers/default-route-step.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    ProcessLoader,
    SectionLoader,
    DefaultRouteMachiningLoader,
    DefaultRouteIterationLoader,
    DefaultRouteParameterLoader,
    DefaultRouteLoader,
    DefaultRouteStepLoader,
    DefaultRouteStepService,
    DefaultRouteStepQueryResolver,
    DefaultRouteStepMutationResolver,
    DefaultRouteStepRelationResolver,
  ],
  exports: [DefaultRouteStepService, DefaultRouteStepLoader],
})
export class DefaultRouteStepModule {}
