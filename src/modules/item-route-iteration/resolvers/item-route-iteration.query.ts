import { Args, Query, Resolver } from "@nestjs/graphql";
import { ItemRouteIterationService } from "../item-route-iteration.service.js";
import type {
  ItemRouteIterationFilterInput,
  PaginationInput,
  ItemRouteIterationConnection,
} from "../../../generated/graphql/types.js";

@Resolver("ItemRouteIteration")
export class ItemRouteIterationQueryResolver {
  constructor(private readonly itemRouteIterationService: ItemRouteIterationService) {}

  @Query("itemRouteIterationById")
  async itemRouteIterationById(@Args("id") id: string) {
    return this.itemRouteIterationService.findOne(id);
  }

  @Query("itemRouteIterationsPaginated")
  async itemRouteIterationsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ItemRouteIterationFilterInput | null,
  ): Promise<ItemRouteIterationConnection> {
    return this.itemRouteIterationService.findMany(pagination, filter);
  }
}
