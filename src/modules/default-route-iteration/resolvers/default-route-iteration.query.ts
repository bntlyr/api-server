import { Args, Query, Resolver } from "@nestjs/graphql";
import { DefaultRouteIterationService } from "../default-route-iteration.service.js";
import type {
  DefaultRouteIterationFilterInput,
  PaginationInput,
  DefaultRouteIterationConnection,
} from "../../../generated/graphql/types.js";

@Resolver("DefaultRouteIteration")
export class DefaultRouteIterationQueryResolver {
  constructor(private readonly defaultRouteIterationService: DefaultRouteIterationService) {}

  @Query("defaultRouteIterationById")
  async defaultRouteIterationById(@Args("id") id: string) {
    return this.defaultRouteIterationService.findOne(id);
  }

  @Query("defaultRouteIterationsPaginated")
  async defaultRouteIterationsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: DefaultRouteIterationFilterInput | null,
  ): Promise<DefaultRouteIterationConnection> {
    return this.defaultRouteIterationService.findMany(pagination, filter);
  }
}
