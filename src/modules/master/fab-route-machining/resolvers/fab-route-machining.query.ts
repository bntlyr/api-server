import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { FabRouteMachiningService } from "../fab-route-machining.service.js";
import type {
  FabRouteMachiningFilterInput,
  PaginationInput,
  FabRouteMachiningConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("FabRouteMachining")
export class FabRouteMachiningQueryResolver {
  constructor(private readonly fabRouteMachiningService: FabRouteMachiningService) {}

  @Query("fabRouteMachiningById")
  async fabRouteMachiningById(@Args("id") id: string, @Context() context?: any) {
    return this.fabRouteMachiningService.findOne(id, context);
  }

  @Query("fabRouteMachiningsPaginated")
  async fabRouteMachiningsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: FabRouteMachiningFilterInput | null,
    @Context() context?: any,
  ): Promise<FabRouteMachiningConnection> {
    return this.fabRouteMachiningService.findMany(pagination, filter, context);
  }
}
