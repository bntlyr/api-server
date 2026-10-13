import { Args, Context, Query, Resolver } from "@nestjs/graphql";
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
  async productionDtrById(@Args("id") id: string, @Context() context?: any) {
    return this.productionDtrService.findOne(id, context);
  }

  @Query("productionDtrsPaginated")
  async productionDtrsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ProductionDtrFilterInput | null,
    @Context() context?: any,
  ): Promise<ProductionDtrConnection> {
    return this.productionDtrService.findMany(pagination, filter, context);
  }
}
