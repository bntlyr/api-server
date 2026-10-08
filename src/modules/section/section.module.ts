import { FabRouteStepLoader } from "../fab-route-step/fab-route-step.loader.js";
import { ItemRouteStepLoader } from "../item-route-step/item-route-step.loader.js";
import { DefaultRouteStepLoader } from "../default-route-step/default-route-step.loader.js";
import { ProcessLoader } from "../process/process.loader.js";
import { MaterialLoader } from "../material/material.loader.js";
import { MachineLoader } from "../machine/machine.loader.js";
import { UserLoader } from "../user/user.loader.js";
import { PositionLoader } from "../position/position.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { SectionService } from "./section.service.js";
import { SectionLoader } from "./section.loader.js";
import { SectionQueryResolver } from "./resolvers/section.query.js";
import { SectionMutationResolver } from "./resolvers/section.mutation.js";
import { SectionRelationResolver } from "./resolvers/section.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    FabRouteStepLoader,
    ItemRouteStepLoader,
    DefaultRouteStepLoader,
    ProcessLoader,
    MaterialLoader,
    MachineLoader,
    UserLoader,
    PositionLoader,
    SectionLoader,
    SectionService,
    SectionQueryResolver,
    SectionMutationResolver,
    SectionRelationResolver,
  ],
  exports: [SectionService, SectionLoader],
})
export class SectionModule {}
