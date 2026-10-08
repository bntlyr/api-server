import { Args, Query, Resolver } from "@nestjs/graphql";
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
  async fabRouteIterationById(@Args("id") id: string) {
    return this.fabRouteIterationService.findOne(id);
  }

  @Query("fabRouteIterationsPaginated")
  async fabRouteIterationsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: FabRouteIterationFilterInput | null,
  ): Promise<FabRouteIterationConnection> {
    return this.fabRouteIterationService.findMany(pagination, filter);
  }
}
