import { ProcessLoader } from "../process/process.loader.js";
import { ItemLoader } from "../item/item.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { ItemPictureService } from "./item-picture.service.js";
import { ItemPictureLoader } from "./item-picture.loader.js";
import { ItemPictureQueryResolver } from "./resolvers/item-picture.query.js";
import { ItemPictureMutationResolver } from "./resolvers/item-picture.mutation.js";
import { ItemPictureRelationResolver } from "./resolvers/item-picture.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    ProcessLoader,
    ItemLoader,
    ItemPictureLoader,
    ItemPictureService,
    ItemPictureQueryResolver,
    ItemPictureMutationResolver,
    ItemPictureRelationResolver,
  ],
  exports: [ItemPictureService, ItemPictureLoader],
})
export class ItemPictureModule {}
