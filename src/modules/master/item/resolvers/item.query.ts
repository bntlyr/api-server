import { Args, Query, Resolver } from "@nestjs/graphql";
import { ItemService } from "../item.service.js";
import type {
  ItemFilterInput,
  PaginationInput,
  ItemConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("Item")
export class ItemQueryResolver {
  constructor(private readonly itemService: ItemService) {}

  @Query("itemById")
  async itemById(@Args("id") id: string) {
    return this.itemService.findOne(id);
  }

  @Query("itemsPaginated")
  async itemsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ItemFilterInput | null,
  ): Promise<ItemConnection> {
    return this.itemService.findMany(pagination, filter);
  }
}
