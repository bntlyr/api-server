import { Args, Query, Resolver } from "@nestjs/graphql";
import { ProductionDtrService } from "../production-dtr.service.js";
import type {
  ProductionDtrFilterInput,
  PaginationInput,
  ProductionDtrConnection,
} from "../../../../generated/graphql/types.js";

@Resolver("ProductionDtr")
export class ProductionDtrQueryResolver {
  constructor(private readonly productionDtrService: ProductionDtrService) {}

  @Query("productionDtrById")
  async productionDtrById(@Args("id") id: string) {
    return this.productionDtrService.findOne(id);
  }

  @Query("productionDtrsPaginated")
  async productionDtrsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ProductionDtrFilterInput | null,
  ): Promise<ProductionDtrConnection> {
    return this.productionDtrService.findMany(pagination, filter);
  }
}
