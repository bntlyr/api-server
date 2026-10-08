import { Args, Query, Resolver } from "@nestjs/graphql";
import { ItemTypeService } from "../item-type.service.js";
import type {
  ItemTypeFilterInput,
  PaginationInput,
  ItemTypeConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("ItemType")
export class ItemTypeQueryResolver {
  constructor(private readonly itemTypeService: ItemTypeService) {}

  @Query("itemTypeById")
  async itemTypeById(@Args("id") id: string) {
    return this.itemTypeService.findOne(id);
  }

  @Query("itemTypesPaginated")
  async itemTypesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ItemTypeFilterInput | null,
  ): Promise<ItemTypeConnection> {
    return this.itemTypeService.findMany(pagination, filter);
  }
}
