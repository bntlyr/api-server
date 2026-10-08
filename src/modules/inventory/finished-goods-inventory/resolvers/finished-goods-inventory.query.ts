import { Args, Query, Resolver } from "@nestjs/graphql";
import { FinishedGoodsInventoryService } from "../finished-goods-inventory.service.js";
import type {
  FinishedGoodsLotConnection,
  FinishedGoodsLotFilterInput,
  FinishedGoodsSummary,
  FinishedGoodsSummaryConnection,
  FinishedGoodsSummaryFilterInput,
  FinishedGoodsTransactionConnection,
  FinishedGoodsTransactionFilterInput,
  PaginationInput,
} from "../../../../generated/graphql/types.js";

@Resolver()
export class FinishedGoodsInventoryQueryResolver {
  constructor(private readonly service: FinishedGoodsInventoryService) {}

  @Query("finishedGoodsLotById")
  async finishedGoodsLotById(@Args("id") id: string) {
    return this.service.findLotById(id);
  }

  @Query("finishedGoodsLotsPaginated")
  async finishedGoodsLotsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: FinishedGoodsLotFilterInput | null,
  ): Promise<FinishedGoodsLotConnection> {
    return this.service.findLots(pagination, filter);
  }

  @Query("finishedGoodsLotsByItemAndFabPaginated")
  async finishedGoodsLotsByItemAndFabPaginated(
    @Args("itemId") itemId: string,
    @Args("fabricationId") fabricationId: string,
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: FinishedGoodsLotFilterInput | null,
  ): Promise<FinishedGoodsLotConnection> {
    return this.service.findLotsByItemAndFab(itemId, fabricationId, pagination, filter);
  }

  @Query("finishedGoodsTransactionById")
  async finishedGoodsTransactionById(@Args("id") id: string) {
    return this.service.findTransactionById(id);
  }

  @Query("finishedGoodsTransactionsPaginated")
  async finishedGoodsTransactionsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: FinishedGoodsTransactionFilterInput | null,
  ): Promise<FinishedGoodsTransactionConnection> {
    return this.service.findTransactions(pagination, filter);
  }

  @Query("finishedGoodsSummaryByItemAndFab")
  async finishedGoodsSummaryByItemAndFab(
    @Args("itemId") itemId: string,
    @Args("fabricationId") fabricationId: string,
  ): Promise<FinishedGoodsSummary | null> {
    return this.service.findSummaryByItemAndFab(itemId, fabricationId);
  }

  @Query("finishedGoodsSummariesPaginated")
  async finishedGoodsSummariesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: FinishedGoodsSummaryFilterInput | null,
  ): Promise<FinishedGoodsSummaryConnection> {
    return this.service.findSummaries(pagination, filter);
  }

  @Query("finishedGoodsInventoryListPaginated")
  async finishedGoodsInventoryListPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: FinishedGoodsSummaryFilterInput | null,
  ): Promise<FinishedGoodsSummaryConnection> {
    return this.service.findSummaries(pagination, filter);
  }
}
