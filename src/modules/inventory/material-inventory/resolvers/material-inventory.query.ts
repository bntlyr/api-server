import { Args, Context, Query, Resolver } from "@nestjs/graphql";
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
  async materialInventoryLotById(@Args("id") id: string, @Context() context: any) {
    return this.service.findLotById(id, context);
  }

  @Query("materialInventoryLotsPaginated")
  async materialInventoryLotsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MaterialInventoryLotFilterInput | null,
    @Context() context?: any,
  ): Promise<MaterialInventoryLotConnection> {
    return this.service.findLots(pagination, filter, context);
  }

  @Query("materialInventoryLotsByMaterialPaginated")
  async materialInventoryLotsByMaterialPaginated(
    @Args("materialId") materialId: string,
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MaterialInventoryLotFilterInput | null,
    @Context() context?: any,
  ): Promise<MaterialInventoryLotConnection> {
    return this.service.findLotsByMaterialId(materialId, pagination, filter, context);
  }

  @Query("materialInventoryTransactionById")
  async materialInventoryTransactionById(@Args("id") id: string, @Context() context: any) {
    return this.service.findTransactionById(id, context);
  }

  @Query("materialInventoryTransactionsPaginated")
  async materialInventoryTransactionsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MaterialInventoryTransactionFilterInput | null,
    @Context() context?: any,
  ): Promise<MaterialInventoryTransactionConnection> {
    return this.service.findTransactions(pagination, filter, context);
  }

  @Query("materialInventorySummaryByMaterialId")
  async materialInventorySummaryByMaterialId(
    @Args("materialId") materialId: string,
    @Context() context: any,
  ): Promise<MaterialInventorySummary | null> {
    return this.service.findSummaryByMaterialId(materialId, context);
  }

  @Query("materialInventorySummariesPaginated")
  async materialInventorySummariesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MaterialInventorySummaryFilterInput | null,
    @Context() context?: any,
  ): Promise<MaterialInventorySummaryConnection> {
    return this.service.findSummaries(pagination, filter, context);
  }
}
