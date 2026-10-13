import { Args, Context, Query, Resolver } from "@nestjs/graphql";
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
  async itemTypeById(@Args("id") id: string, @Context() context?: any) {
    return this.itemTypeService.findOne(id, context);
  }

  @Query("itemTypesPaginated")
  async itemTypesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ItemTypeFilterInput | null,
    @Context() context?: any,
  ): Promise<ItemTypeConnection> {
    return this.itemTypeService.findMany(pagination, filter, context);
  }
}
