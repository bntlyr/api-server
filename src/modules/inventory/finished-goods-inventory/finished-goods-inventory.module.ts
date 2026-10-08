import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { AreaLoader } from "../../master/area/area.loader.js";
import { BoxTypeLoader } from "../../master/box-type/box-type.loader.js";
import { FabricationLoader } from "../../master/fabrication/fabrication.loader.js";
import { ItemTypeLoader } from "../../master/item-type/item-type.loader.js";
import { ItemLoader } from "../../master/item/item.loader.js";
import { LocationLoader } from "../../master/location/location.loader.js";
import { RawMaterialLoader } from "../../master/raw-material/raw-material.loader.js";
import { FinishedGoodsInventoryLoader } from "./finished-goods-inventory.loader.js";
import { FinishedGoodsInventoryService } from "./finished-goods-inventory.service.js";
import { FinishedGoodsInventoryQueryResolver } from "./resolvers/finished-goods-inventory.query.js";
import { FinishedGoodsInventoryMutationResolver } from "./resolvers/finished-goods-inventory.mutation.js";
import {
  FabricationFinishedGoodsExtensionResolver,
  FinishedGoodsLotRelationResolver,
  FinishedGoodsSummaryRelationResolver,
  FinishedGoodsTransactionRelationResolver,
  ItemFinishedGoodsExtensionResolver,
} from "./resolvers/finished-goods-inventory.relation.js";

@Module({
  imports: [PrismaModule],
  providers: [
    AreaLoader,
    BoxTypeLoader,
    FabricationLoader,
    ItemLoader,
    ItemTypeLoader,
    LocationLoader,
    RawMaterialLoader,
    FinishedGoodsInventoryLoader,
    FinishedGoodsInventoryService,
    FinishedGoodsInventoryQueryResolver,
    FinishedGoodsInventoryMutationResolver,
    FinishedGoodsLotRelationResolver,
    FinishedGoodsTransactionRelationResolver,
    FinishedGoodsSummaryRelationResolver,
    ItemFinishedGoodsExtensionResolver,
    FabricationFinishedGoodsExtensionResolver,
  ],
  exports: [FinishedGoodsInventoryService, FinishedGoodsInventoryLoader],
})
export class FinishedGoodsInventoryModule {}
