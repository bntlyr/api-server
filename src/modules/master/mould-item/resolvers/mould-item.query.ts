import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { MouldItemService } from "../mould-item.service.js";
import type {
  MouldItemFilterInput,
  PaginationInput,
  MouldItemConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("MouldItem")
export class MouldItemQueryResolver {
  constructor(private readonly mouldItemService: MouldItemService) {}

  @Query("mouldItemById")
  async mouldItemById(@Args("id") id: string, @Context() context?: any) {
    return this.mouldItemService.findOne(id, context);
  }

  @Query("mouldItemsPaginated")
  async mouldItemsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MouldItemFilterInput | null,
    @Context() context?: any,
  ): Promise<MouldItemConnection> {
    return this.mouldItemService.findMany(pagination, filter, context);
  }
}
