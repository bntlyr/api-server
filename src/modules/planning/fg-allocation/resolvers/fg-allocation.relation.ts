import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { SalesOrderLoader } from "../../../sales/sales-order/sales-order.loader.js";
import { FinishedGoodsInventoryLoader } from "../../../inventory/finished-goods-inventory/finished-goods-inventory.loader.js";
import { AreaLoader } from "../../../master/area/area.loader.js";
import { LocationLoader } from "../../../master/location/location.loader.js";
import type { FinishedGoodsAllocationRequest as PrismaFgAllocationRequest } from "../../../../generated/prisma/client.js";

@Resolver("FinishedGoodsAllocationRequest")
export class FinishedGoodsAllocationRelationResolver {
  constructor(
    private readonly salesOrderLoader: SalesOrderLoader,
    private readonly fgLotLoader: FinishedGoodsInventoryLoader,
    private readonly areaLoader: AreaLoader,
    private readonly locationLoader: LocationLoader,
  ) {}

  @ResolveField("salesOrder")
  async salesOrder(@Parent() req: PrismaFgAllocationRequest) {
    if (!req.salesOrderId) return null;
    return this.salesOrderLoader.byId.load(req.salesOrderId);
  }

  @ResolveField("finishedGoodsLot")
  async finishedGoodsLot(@Parent() req: PrismaFgAllocationRequest) {
    if (!req.finishedGoodsLotId) return null;
    return this.fgLotLoader.lotById.load(req.finishedGoodsLotId);
  }

  @ResolveField("destinationArea")
  async destinationArea(@Parent() req: PrismaFgAllocationRequest) {
    if (!req.destinationAreaId) return null;
    return this.areaLoader.byId.load(req.destinationAreaId);
  }

  @ResolveField("destinationLocation")
  async destinationLocation(@Parent() req: PrismaFgAllocationRequest) {
    if (!req.destinationLocationId) return null;
    return this.locationLoader.byId.load(req.destinationLocationId);
  }
}
