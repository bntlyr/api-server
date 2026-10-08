import { Args, Query, Resolver } from "@nestjs/graphql";
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
  async mouldItemById(@Args("id") id: string) {
    return this.mouldItemService.findOne(id);
  }

  @Query("mouldItemsPaginated")
  async mouldItemsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MouldItemFilterInput | null,
  ): Promise<MouldItemConnection> {
    return this.mouldItemService.findMany(pagination, filter);
  }
}
