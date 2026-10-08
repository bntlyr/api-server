import { UserLoader } from "../../user/user.loader.js";
import { SectionLoader } from "../section/section.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { PositionService } from "./position.service.js";
import { PositionLoader } from "./position.loader.js";
import { PositionQueryResolver } from "./resolvers/position.query.js";
import { PositionMutationResolver } from "./resolvers/position.mutation.js";
import { PositionRelationResolver } from "./resolvers/position.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    UserLoader,
    SectionLoader,
    PositionLoader,
    PositionService,
    PositionQueryResolver,
    PositionMutationResolver,
    PositionRelationResolver,
  ],
  exports: [PositionService, PositionLoader],
})
export class PositionModule {}
