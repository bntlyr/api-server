import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { ItemRouteService } from "../item-route.service.js";
import type {
  ItemRouteFilterInput,
  PaginationInput,
  ItemRouteConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("ItemRoute")
export class ItemRouteQueryResolver {
  constructor(private readonly itemRouteService: ItemRouteService) {}

  @Query("itemRouteById")
  async itemRouteById(@Args("id") id: string, @Context() context?: any) {
    return this.itemRouteService.findOne(id, context);
  }

  @Query("itemRoutesPaginated")
  async itemRoutesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ItemRouteFilterInput | null,
    @Context() context?: any,
  ): Promise<ItemRouteConnection> {
    return this.itemRouteService.findMany(pagination, filter, context);
  }
}
