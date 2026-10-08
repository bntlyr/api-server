import { ItemLoader } from "../item/item.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { ItemRevisionService } from "./item-revision.service.js";
import { ItemRevisionLoader } from "./item-revision.loader.js";
import { ItemRevisionQueryResolver } from "./resolvers/item-revision.query.js";
import { ItemRevisionMutationResolver } from "./resolvers/item-revision.mutation.js";
import { ItemRevisionRelationResolver } from "./resolvers/item-revision.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    ItemLoader,
    ItemRevisionLoader,
    ItemRevisionService,
    ItemRevisionQueryResolver,
    ItemRevisionMutationResolver,
    ItemRevisionRelationResolver,
  ],
  exports: [ItemRevisionService, ItemRevisionLoader],
})
export class ItemRevisionModule {}
