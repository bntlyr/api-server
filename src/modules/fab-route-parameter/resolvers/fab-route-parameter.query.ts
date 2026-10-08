import { Args, Query, Resolver } from "@nestjs/graphql";
import { FabRouteParameterService } from "../fab-route-parameter.service.js";
import type {
  FabRouteParameterFilterInput,
  PaginationInput,
  FabRouteParameterConnection,
} from "../../../generated/graphql/types.js";

@Resolver("FabRouteParameter")
export class FabRouteParameterQueryResolver {
  constructor(private readonly fabRouteParameterService: FabRouteParameterService) {}

  @Query("fabRouteParameterById")
  async fabRouteParameterById(@Args("id") id: string) {
    return this.fabRouteParameterService.findOne(id);
  }

  @Query("fabRouteParametersPaginated")
  async fabRouteParametersPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: FabRouteParameterFilterInput | null,
  ): Promise<FabRouteParameterConnection> {
    return this.fabRouteParameterService.findMany(pagination, filter);
  }
}
