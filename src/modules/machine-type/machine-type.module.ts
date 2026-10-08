import { MachineLoader } from "../machine/machine.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { MachineTypeService } from "./machine-type.service.js";
import { MachineTypeLoader } from "./machine-type.loader.js";
import { MachineTypeQueryResolver } from "./resolvers/machine-type.query.js";
import { MachineTypeMutationResolver } from "./resolvers/machine-type.mutation.js";
import { MachineTypeRelationResolver } from "./resolvers/machine-type.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    MachineLoader,
    MachineTypeLoader,
    MachineTypeService,
    MachineTypeQueryResolver,
    MachineTypeMutationResolver,
    MachineTypeRelationResolver,
  ],
  exports: [MachineTypeService, MachineTypeLoader],
})
export class MachineTypeModule {}
