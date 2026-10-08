import { ProcessLoader } from "../process/process.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { ParameterService } from "./parameter.service.js";
import { ParameterLoader } from "./parameter.loader.js";
import { ParameterQueryResolver } from "./resolvers/parameter.query.js";
import { ParameterMutationResolver } from "./resolvers/parameter.mutation.js";
import { ParameterRelationResolver } from "./resolvers/parameter.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    ProcessLoader,
    ParameterLoader,
    ParameterService,
    ParameterQueryResolver,
    ParameterMutationResolver,
    ParameterRelationResolver,
  ],
  exports: [ParameterService, ParameterLoader],
})
export class ParameterModule {}
