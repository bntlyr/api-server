import { DefaultRouteStepLoader } from "../default-route-step/default-route-step.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { DefaultRouteParameterService } from "./default-route-parameter.service.js";
import { DefaultRouteParameterLoader } from "./default-route-parameter.loader.js";
import { DefaultRouteParameterQueryResolver } from "./resolvers/default-route-parameter.query.js";
import { DefaultRouteParameterMutationResolver } from "./resolvers/default-route-parameter.mutation.js";
import { DefaultRouteParameterRelationResolver } from "./resolvers/default-route-parameter.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    DefaultRouteStepLoader,
    DefaultRouteParameterLoader,
    DefaultRouteParameterService,
    DefaultRouteParameterQueryResolver,
    DefaultRouteParameterMutationResolver,
    DefaultRouteParameterRelationResolver,
  ],
  exports: [DefaultRouteParameterService, DefaultRouteParameterLoader],
})
export class DefaultRouteParameterModule {}
