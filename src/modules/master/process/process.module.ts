import { FabRouteStepLoader } from "../fab-route-step/fab-route-step.loader.js";
import { ItemRouteStepLoader } from "../item-route-step/item-route-step.loader.js";
import { DefaultRouteStepLoader } from "../default-route-step/default-route-step.loader.js";
import { ProcessMachiningLoader } from "../process-machining/process-machining.loader.js";
import { ProcessIterationLoader } from "../process-iteration/process-iteration.loader.js";
import { ItemPictureLoader } from "../item-picture/item-picture.loader.js";
import { ParameterLoader } from "../parameter/parameter.loader.js";
import { SectionLoader } from "../section/section.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { ProcessService } from "./process.service.js";
import { ProcessLoader } from "./process.loader.js";
import { ProcessQueryResolver } from "./resolvers/process.query.js";
import { ProcessMutationResolver } from "./resolvers/process.mutation.js";
import { ProcessRelationResolver } from "./resolvers/process.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    FabRouteStepLoader,
    ItemRouteStepLoader,
    DefaultRouteStepLoader,
    ProcessMachiningLoader,
    ProcessIterationLoader,
    ItemPictureLoader,
    ParameterLoader,
    SectionLoader,
    ProcessLoader,
    ProcessService,
    ProcessQueryResolver,
    ProcessMutationResolver,
    ProcessRelationResolver,
  ],
  exports: [ProcessService, ProcessLoader],
})
export class ProcessModule {}
