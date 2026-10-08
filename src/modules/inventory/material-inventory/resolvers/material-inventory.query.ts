import { Args, Query, Resolver } from "@nestjs/graphql";
import { MaterialInventoryService } from "../material-inventory.service.js";
import type {
  MaterialInventoryLotConnection,
  MaterialInventoryLotFilterInput,
  MaterialInventorySummary,
  MaterialInventorySummaryConnection,
  MaterialInventorySummaryFilterInput,
  MaterialInventoryTransactionConnection,
  MaterialInventoryTransactionFilterInput,
  PaginationInput,
} from "../../../../generated/graphql/types.js";

@Resolver()
export class MaterialInventoryQueryResolver {
  constructor(private readonly service: MaterialInventoryService) {}

  @Query("materialInventoryLotById")
  async materialInventoryLotById(@Args("id") id: string) {
    return this.service.findLotById(id);
  }

  @Query("materialInventoryLotsPaginated")
  async materialInventoryLotsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MaterialInventoryLotFilterInput | null,
  ): Promise<MaterialInventoryLotConnection> {
    return this.service.findLots(pagination, filter);
  }

  @Query("materialInventoryLotsByMaterialPaginated")
  async materialInventoryLotsByMaterialPaginated(
    @Args("materialId") materialId: string,
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MaterialInventoryLotFilterInput | null,
  ): Promise<MaterialInventoryLotConnection> {
    return this.service.findLotsByMaterialId(materialId, pagination, filter);
  }

  @Query("materialInventoryTransactionById")
  async materialInventoryTransactionById(@Args("id") id: string) {
    return this.service.findTransactionById(id);
  }

  @Query("materialInventoryTransactionsPaginated")
  async materialInventoryTransactionsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MaterialInventoryTransactionFilterInput | null,
  ): Promise<MaterialInventoryTransactionConnection> {
    return this.service.findTransactions(pagination, filter);
  }

  @Query("materialInventorySummaryByMaterialId")
  async materialInventorySummaryByMaterialId(
    @Args("materialId") materialId: string,
  ): Promise<MaterialInventorySummary | null> {
    return this.service.findSummaryByMaterialId(materialId);
  }

  @Query("materialInventorySummariesPaginated")
  async materialInventorySummariesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MaterialInventorySummaryFilterInput | null,
  ): Promise<MaterialInventorySummaryConnection> {
    return this.service.findSummaries(pagination, filter);
  }
}
