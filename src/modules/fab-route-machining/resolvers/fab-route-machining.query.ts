import { Args, Query, Resolver } from "@nestjs/graphql";
import { FabRouteMachiningService } from "../fab-route-machining.service.js";
import type {
  FabRouteMachiningFilterInput,
  PaginationInput,
  FabRouteMachiningConnection,
} from "../../../generated/graphql/types.js";

@Resolver("FabRouteMachining")
export class FabRouteMachiningQueryResolver {
  constructor(private readonly fabRouteMachiningService: FabRouteMachiningService) {}

  @Query("fabRouteMachiningById")
  async fabRouteMachiningById(@Args("id") id: string) {
    return this.fabRouteMachiningService.findOne(id);
  }

  @Query("fabRouteMachiningsPaginated")
  async fabRouteMachiningsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: FabRouteMachiningFilterInput | null,
  ): Promise<FabRouteMachiningConnection> {
    return this.fabRouteMachiningService.findMany(pagination, filter);
  }
}
