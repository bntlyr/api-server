import { Args, Query, Resolver } from "@nestjs/graphql";
import { ItemRouteParameterService } from "../item-route-parameter.service.js";
import type {
  ItemRouteParameterFilterInput,
  PaginationInput,
  ItemRouteParameterConnection,
} from "../../../generated/graphql/types.js";

@Resolver("ItemRouteParameter")
export class ItemRouteParameterQueryResolver {
  constructor(private readonly itemRouteParameterService: ItemRouteParameterService) {}

  @Query("itemRouteParameterById")
  async itemRouteParameterById(@Args("id") id: string) {
    return this.itemRouteParameterService.findOne(id);
  }

  @Query("itemRouteParametersPaginated")
  async itemRouteParametersPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ItemRouteParameterFilterInput | null,
  ): Promise<ItemRouteParameterConnection> {
    return this.itemRouteParameterService.findMany(pagination, filter);
  }
}
