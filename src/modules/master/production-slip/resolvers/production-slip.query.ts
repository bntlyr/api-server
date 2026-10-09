import { Args, Query, Resolver } from "@nestjs/graphql";
import { ProductionSlipService } from "../production-slip.service.js";
import type {
  ProductionSlipFilterInput,
  PaginationInput,
  ProductionSlipConnection,
} from "../../../../generated/graphql/types.js";

@Resolver("ProductionSlip")
export class ProductionSlipQueryResolver {
  constructor(private readonly productionSlipService: ProductionSlipService) {}

  @Query("productionSlipById")
  async productionSlipById(@Args("id") id: string) {
    return this.productionSlipService.findOne(id);
  }

  @Query("productionSlipsPaginated")
  async productionSlipsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ProductionSlipFilterInput | null,
  ): Promise<ProductionSlipConnection> {
    return this.productionSlipService.findMany(pagination, filter);
  }
}
