import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { FabRouteIterationService } from "../fab-route-iteration.service.js";
import type {
  FabRouteIterationFilterInput,
  PaginationInput,
  FabRouteIterationConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("FabRouteIteration")
export class FabRouteIterationQueryResolver {
  constructor(private readonly fabRouteIterationService: FabRouteIterationService) {}

  @Query("fabRouteIterationById")
  async fabRouteIterationById(@Args("id") id: string, @Context() context?: any) {
    return this.fabRouteIterationService.findOne(id, context);
  }

  @Query("fabRouteIterationsPaginated")
  async fabRouteIterationsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: FabRouteIterationFilterInput | null,
    @Context() context?: any,
  ): Promise<FabRouteIterationConnection> {
    return this.fabRouteIterationService.findMany(pagination, filter, context);
  }
}
