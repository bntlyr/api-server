import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { ItemRouteParameterService } from "../item-route-parameter.service.js";
import type {
  ItemRouteParameterFilterInput,
  PaginationInput,
  ItemRouteParameterConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("ItemRouteParameter")
export class ItemRouteParameterQueryResolver {
  constructor(private readonly itemRouteParameterService: ItemRouteParameterService) {}

  @Query("itemRouteParameterById")
  async itemRouteParameterById(@Args("id") id: string, @Context() context?: any) {
    return this.itemRouteParameterService.findOne(id, context);
  }

  @Query("itemRouteParametersPaginated")
  async itemRouteParametersPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ItemRouteParameterFilterInput | null,
    @Context() context?: any,
  ): Promise<ItemRouteParameterConnection> {
    return this.itemRouteParameterService.findMany(pagination, filter, context);
  }
}
