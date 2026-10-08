import { Args, Query, Resolver } from "@nestjs/graphql";
import { ItemRouteMachiningService } from "../item-route-machining.service.js";
import type {
  ItemRouteMachiningFilterInput,
  PaginationInput,
  ItemRouteMachiningConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("ItemRouteMachining")
export class ItemRouteMachiningQueryResolver {
  constructor(private readonly itemRouteMachiningService: ItemRouteMachiningService) {}

  @Query("itemRouteMachiningById")
  async itemRouteMachiningById(@Args("id") id: string) {
    return this.itemRouteMachiningService.findOne(id);
  }

  @Query("itemRouteMachiningsPaginated")
  async itemRouteMachiningsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ItemRouteMachiningFilterInput | null,
  ): Promise<ItemRouteMachiningConnection> {
    return this.itemRouteMachiningService.findMany(pagination, filter);
  }
}
