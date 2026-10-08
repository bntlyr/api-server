import { MouldItemLoader } from "../mould-item/mould-item.loader.js";
import { ItemRouteLoader } from "../item-route/item-route.loader.js";
import { FabricationLoader } from "../fabrication/fabrication.loader.js";
import { ItemRevisionLoader } from "../item-revision/item-revision.loader.js";
import { ItemPictureLoader } from "../item-picture/item-picture.loader.js";
import { BoxTypeLoader } from "../box-type/box-type.loader.js";
import { RawMaterialLoader } from "../raw-material/raw-material.loader.js";
import { ItemTypeLoader } from "../item-type/item-type.loader.js";
import { CustomerLoader } from "../customer/customer.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/index.js";
import { ItemService } from "./item.service.js";
import { ItemLoader } from "./item.loader.js";
import { ItemQueryResolver } from "./resolvers/item.query.js";
import { ItemMutationResolver } from "./resolvers/item.mutation.js";
import { ItemRelationResolver } from "./resolvers/item.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    MouldItemLoader,
    ItemRouteLoader,
    FabricationLoader,
    ItemRevisionLoader,
    ItemPictureLoader,
    BoxTypeLoader,
    RawMaterialLoader,
    ItemTypeLoader,
    CustomerLoader,
    ItemLoader,
    ItemService,
    ItemQueryResolver,
    ItemMutationResolver,
    ItemRelationResolver,
  ],
  exports: [ItemService, ItemLoader],
})
export class ItemModule {}
