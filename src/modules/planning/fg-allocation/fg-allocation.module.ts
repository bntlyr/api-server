import { Module } from "@nestjs/common";
import { PrismaModule } from "../../../prisma/index.js";
import { AuthModule } from "../../../auth/auth.module.js";
import { SalesOrderModule } from "../../sales/sales-order/sales-order.module.js";
import { FinishedGoodsInventoryModule } from "../../inventory/finished-goods-inventory/finished-goods-inventory.module.js";
import { AreaModule } from "../../master/area/area.module.js";
import { LocationModule } from "../../master/location/location.module.js";
import { FinishedGoodsAllocationService } from "./fg-allocation.service.js";
import { FinishedGoodsAllocationRequestLoader } from "./fg-allocation.loader.js";
import { FinishedGoodsAllocationQueryResolver } from "./resolvers/fg-allocation.query.js";
import { FinishedGoodsAllocationMutationResolver } from "./resolvers/fg-allocation.mutation.js";
import { FinishedGoodsAllocationRelationResolver } from "./resolvers/fg-allocation.relation.js";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    SalesOrderModule,
    FinishedGoodsInventoryModule,
    AreaModule,
    LocationModule,
  ],
  providers: [
    FinishedGoodsAllocationRequestLoader,
    FinishedGoodsAllocationService,
    FinishedGoodsAllocationQueryResolver,
    FinishedGoodsAllocationMutationResolver,
    FinishedGoodsAllocationRelationResolver,
  ],
  exports: [FinishedGoodsAllocationService, FinishedGoodsAllocationRequestLoader],
})
export class FinishedGoodsAllocationModule {}
