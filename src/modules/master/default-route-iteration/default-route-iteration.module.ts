import { DefaultRouteStepLoader } from "../default-route-step/default-route-step.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { DefaultRouteIterationService } from "./default-route-iteration.service.js";
import { DefaultRouteIterationLoader } from "./default-route-iteration.loader.js";
import { DefaultRouteIterationQueryResolver } from "./resolvers/default-route-iteration.query.js";
import { DefaultRouteIterationMutationResolver } from "./resolvers/default-route-iteration.mutation.js";
import { DefaultRouteIterationRelationResolver } from "./resolvers/default-route-iteration.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    DefaultRouteStepLoader,
    DefaultRouteIterationLoader,
    DefaultRouteIterationService,
    DefaultRouteIterationQueryResolver,
    DefaultRouteIterationMutationResolver,
    DefaultRouteIterationRelationResolver,
  ],
  exports: [DefaultRouteIterationService, DefaultRouteIterationLoader],
})
export class DefaultRouteIterationModule {}
