import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { BoxContainerService } from "./box-container.service.js";
import { BoxContainerLoader } from "./box-container.loader.js";
import { BoxContainerQueryResolver } from "./resolvers/box-container.query.js";
import { BoxContainerMutationResolver } from "./resolvers/box-container.mutation.js";
import { BoxContainerRelationResolver } from "./resolvers/box-container.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    BoxContainerLoader,
    BoxContainerService,
    BoxContainerQueryResolver,
    BoxContainerMutationResolver,
    BoxContainerRelationResolver,
  ],
  exports: [BoxContainerService, BoxContainerLoader],
})
export class BoxContainerModule {}
