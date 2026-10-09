import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { ItemLoader } from "../../../master/item/item.loader.js";
import { FabricationLoader } from "../../../master/fabrication/fabrication.loader.js";
import { CustomerLoader } from "../../../master/customer/customer.loader.js";
import type { SalesOrder as PrismaSalesOrder } from "../../../../generated/prisma/client.js";

@Resolver("SalesOrder")
export class SalesOrderRelationResolver {
  constructor(
    private readonly itemLoader: ItemLoader,
    private readonly fabricationLoader: FabricationLoader,
    private readonly customerLoader: CustomerLoader,
  ) {}

  @ResolveField("item")
  async item(@Parent() order: PrismaSalesOrder) {
    if (!order.itemId) return null;
    return this.itemLoader.byId.load(order.itemId);
  }

  @ResolveField("fabrication")
  async fabrication(@Parent() order: PrismaSalesOrder) {
    if (!order.fabricationId) return null;
    return this.fabricationLoader.byId.load(order.fabricationId);
  }

  @ResolveField("customer")
  async customer(@Parent() order: PrismaSalesOrder) {
    if (!order.customerId) return null;
    return this.customerLoader.byId.load(order.customerId);
  }

  @ResolveField("remainingQty")
  async remainingQty(@Parent() order: PrismaSalesOrder) {
    const orderQty = Number(order.orderQty ?? 0);
    const shippedQty = Number(order.shippedQty ?? 0);
    return Math.max(0, orderQty - shippedQty);
  }
}
