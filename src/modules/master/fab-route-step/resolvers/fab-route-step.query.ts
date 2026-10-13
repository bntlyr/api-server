import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { FabRouteStepService } from "../fab-route-step.service.js";
import type {
  FabRouteStepFilterInput,
  PaginationInput,
  FabRouteStepConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("FabRouteStep")
export class FabRouteStepQueryResolver {
  constructor(private readonly fabRouteStepService: FabRouteStepService) {}

  @Query("fabRouteStepById")
  async fabRouteStepById(@Args("id") id: string, @Context() context?: any) {
    return this.fabRouteStepService.findOne(id, context);
  }

  @Query("fabRouteStepsPaginated")
  async fabRouteStepsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: FabRouteStepFilterInput | null,
    @Context() context?: any,
  ): Promise<FabRouteStepConnection> {
    return this.fabRouteStepService.findMany(pagination, filter, context);
  }
}
