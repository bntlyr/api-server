import { Args, Query, Resolver } from "@nestjs/graphql";
import { FabRouteStepService } from "../fab-route-step.service.js";
import type {
  FabRouteStepFilterInput,
  PaginationInput,
  FabRouteStepConnection,
} from "../../../generated/graphql/types.js";

@Resolver("FabRouteStep")
export class FabRouteStepQueryResolver {
  constructor(private readonly fabRouteStepService: FabRouteStepService) {}

  @Query("fabRouteStepById")
  async fabRouteStepById(@Args("id") id: string) {
    return this.fabRouteStepService.findOne(id);
  }

  @Query("fabRouteStepsPaginated")
  async fabRouteStepsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: FabRouteStepFilterInput | null,
  ): Promise<FabRouteStepConnection> {
    return this.fabRouteStepService.findMany(pagination, filter);
  }
}
