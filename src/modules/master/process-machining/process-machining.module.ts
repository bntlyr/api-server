import { MachineLoader } from "../machine/machine.loader.js";
import { ProcessLoader } from "../process/process.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { ProcessMachiningService } from "./process-machining.service.js";
import { ProcessMachiningLoader } from "./process-machining.loader.js";
import { ProcessMachiningQueryResolver } from "./resolvers/process-machining.query.js";
import { ProcessMachiningMutationResolver } from "./resolvers/process-machining.mutation.js";
import { ProcessMachiningRelationResolver } from "./resolvers/process-machining.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    MachineLoader,
    ProcessLoader,
    ProcessMachiningLoader,
    ProcessMachiningService,
    ProcessMachiningQueryResolver,
    ProcessMachiningMutationResolver,
    ProcessMachiningRelationResolver,
  ],
  exports: [ProcessMachiningService, ProcessMachiningLoader],
})
export class ProcessMachiningModule {}
