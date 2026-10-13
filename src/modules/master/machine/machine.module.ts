import { MachineToolLoader } from "../machine-tool/machine-tool.loader.js";
import { FabRouteMachiningLoader } from "../fab-route-machining/fab-route-machining.loader.js";
import { ItemRouteMachiningLoader } from "../item-route-machining/item-route-machining.loader.js";
import { DefaultRouteMachiningLoader } from "../default-route-machining/default-route-machining.loader.js";
import { ProcessMachiningLoader } from "../process-machining/process-machining.loader.js";
import { SectionLoader } from "../section/section.loader.js";
import { MachineTypeLoader } from "../machine-type/machine-type.loader.js";
import { UserLoader } from "../../user/user.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { MachineService } from "./machine.service.js";
import { MachineLoader } from "./machine.loader.js";
import { MachineQueryResolver } from "./resolvers/machine.query.js";
import { MachineMutationResolver } from "./resolvers/machine.mutation.js";
import { MachineRelationResolver } from "./resolvers/machine.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    UserLoader,
    MachineToolLoader,
    FabRouteMachiningLoader,
    ItemRouteMachiningLoader,
    DefaultRouteMachiningLoader,
    ProcessMachiningLoader,
    SectionLoader,
    MachineTypeLoader,
    MachineLoader,
    MachineService,
    MachineQueryResolver,
    MachineMutationResolver,
    MachineRelationResolver,
  ],
  exports: [MachineService, MachineLoader],
})
export class MachineModule {}
