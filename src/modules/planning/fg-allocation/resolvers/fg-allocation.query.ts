import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { FinishedGoodsAllocationService } from "../fg-allocation.service.js";
import type {
  AvailableFgStockForOrder,
  FinishedGoodsAllocationRequest,
} from "../../../../generated/graphql/types.js";

@Resolver("FinishedGoodsAllocationRequest")
export class FinishedGoodsAllocationQueryResolver {
  constructor(private readonly service: FinishedGoodsAllocationService) {}

  @Query("availableFgStockForOrder")
  async availableFgStockForOrder(
    @Args("salesOrderId") salesOrderId: string,
  ): Promise<AvailableFgStockForOrder[]> {
    return this.service.getAvailableFgStockForOrder(salesOrderId);
  }

  @Query("fgAllocationRequests")
  async fgAllocationRequests(
    @Args("salesOrderId", { nullable: true }) salesOrderId?: string | null,
  ): Promise<FinishedGoodsAllocationRequest[]> {
    if (salesOrderId) {
      return this.service.findBySalesOrderId(salesOrderId) as any;
    }
    return [];
  }

  @Query("fgAllocationRequestById")
  async fgAllocationRequestById(
    @Args("id") id: string,
  ): Promise<FinishedGoodsAllocationRequest | null> {
    return this.service.findById(id) as any;
  }
}
