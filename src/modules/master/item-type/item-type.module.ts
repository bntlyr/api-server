import { DefaultRouteLoader } from "../default-route/default-route.loader.js";
import { ItemLoader } from "../item/item.loader.js";
import { MouldTypeLoader } from "../mould-type/mould-type.loader.js";
import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma//index.js";
import { ItemTypeService } from "./item-type.service.js";
import { ItemTypeLoader } from "./item-type.loader.js";
import { ItemTypeQueryResolver } from "./resolvers/item-type.query.js";
import { ItemTypeMutationResolver } from "./resolvers/item-type.mutation.js";
import { ItemTypeRelationResolver } from "./resolvers/item-type.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    DefaultRouteLoader,
    ItemLoader,
    MouldTypeLoader,
    ItemTypeLoader,
    ItemTypeService,
    ItemTypeQueryResolver,
    ItemTypeMutationResolver,
    ItemTypeRelationResolver,
  ],
  exports: [ItemTypeService, ItemTypeLoader],
})
export class ItemTypeModule {}
