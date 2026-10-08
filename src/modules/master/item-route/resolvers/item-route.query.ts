import { Args, Query, Resolver } from "@nestjs/graphql";
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
  async itemRouteById(@Args("id") id: string) {
    return this.itemRouteService.findOne(id);
  }

  @Query("itemRoutesPaginated")
  async itemRoutesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ItemRouteFilterInput | null,
  ): Promise<ItemRouteConnection> {
    return this.itemRouteService.findMany(pagination, filter);
  }
}
