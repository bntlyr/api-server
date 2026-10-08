import { ProcessLoader } from "../process/process.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { ProcessIterationService } from "./process-iteration.service.js";
import { ProcessIterationLoader } from "./process-iteration.loader.js";
import { ProcessIterationQueryResolver } from "./resolvers/process-iteration.query.js";
import { ProcessIterationMutationResolver } from "./resolvers/process-iteration.mutation.js";
import { ProcessIterationRelationResolver } from "./resolvers/process-iteration.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    ProcessLoader,
    ProcessIterationLoader,
    ProcessIterationService,
    ProcessIterationQueryResolver,
    ProcessIterationMutationResolver,
    ProcessIterationRelationResolver,
  ],
  exports: [ProcessIterationService, ProcessIterationLoader],
})
export class ProcessIterationModule {}
