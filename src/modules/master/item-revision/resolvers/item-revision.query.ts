import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { ItemRevisionService } from "../item-revision.service.js";
import type {
  ItemRevisionFilterInput,
  PaginationInput,
  ItemRevisionConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("ItemRevision")
export class ItemRevisionQueryResolver {
  constructor(private readonly itemRevisionService: ItemRevisionService) {}

  @Query("itemRevisionById")
  async itemRevisionById(@Args("id") id: string, @Context() context?: any) {
    return this.itemRevisionService.findOne(id, context);
  }

  @Query("itemRevisionsPaginated")
  async itemRevisionsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ItemRevisionFilterInput | null,
    @Context() context?: any,
  ): Promise<ItemRevisionConnection> {
    return this.itemRevisionService.findMany(pagination, filter, context);
  }
}
