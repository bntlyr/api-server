import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { ProductionProcessService } from "../production-process.service.js";
import type {
  ProductionProcessFilterInput,
  PaginationInput,
  ProductionProcessConnection,
} from "../../../../generated/graphql/types.js";

@Resolver("ProductionProcess")
export class ProductionProcessQueryResolver {
  constructor(private readonly productionProcessService: ProductionProcessService) {}

  @Query("productionProcessById")
  async productionProcessById(@Args("id") id: string, @Context() context?: any) {
    return this.productionProcessService.findOne(id, context);
  }

  @Query("productionProcessesPaginated")
  async productionProcessesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ProductionProcessFilterInput | null,
    @Context() context?: any,
  ): Promise<ProductionProcessConnection> {
    return this.productionProcessService.findMany(pagination, filter, context);
  }
}
