import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { BoxContainerItemService } from "./box-container-item.service.js";
import { BoxContainerItemLoader } from "./box-container-item.loader.js";
import { BoxContainerItemQueryResolver } from "./resolvers/box-container-item.query.js";
import { BoxContainerItemMutationResolver } from "./resolvers/box-container-item.mutation.js";
import { BoxContainerItemRelationResolver } from "./resolvers/box-container-item.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    BoxContainerItemLoader,
    BoxContainerItemService,
    BoxContainerItemQueryResolver,
    BoxContainerItemMutationResolver,
    BoxContainerItemRelationResolver,
  ],
  exports: [BoxContainerItemService, BoxContainerItemLoader],
})
export class BoxContainerItemModule {}
