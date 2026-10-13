import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { ItemRouteIterationService } from "../item-route-iteration.service.js";
import type {
  ItemRouteIterationFilterInput,
  PaginationInput,
  ItemRouteIterationConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("ItemRouteIteration")
export class ItemRouteIterationQueryResolver {
  constructor(private readonly itemRouteIterationService: ItemRouteIterationService) {}

  @Query("itemRouteIterationById")
  async itemRouteIterationById(@Args("id") id: string, @Context() context?: any) {
    return this.itemRouteIterationService.findOne(id, context);
  }

  @Query("itemRouteIterationsPaginated")
  async itemRouteIterationsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ItemRouteIterationFilterInput | null,
    @Context() context?: any,
  ): Promise<ItemRouteIterationConnection> {
    return this.itemRouteIterationService.findMany(pagination, filter, context);
  }
}
