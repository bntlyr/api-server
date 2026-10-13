import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { FabRouteService } from "../fab-route.service.js";
import type {
  FabRouteFilterInput,
  PaginationInput,
  FabRouteConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("FabRoute")
export class FabRouteQueryResolver {
  constructor(private readonly fabRouteService: FabRouteService) {}

  @Query("fabRouteById")
  async fabRouteById(@Args("id") id: string, @Context() context?: any) {
    return this.fabRouteService.findOne(id, context);
  }

  @Query("fabRoutesPaginated")
  async fabRoutesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: FabRouteFilterInput | null,
    @Context() context?: any,
  ): Promise<FabRouteConnection> {
    return this.fabRouteService.findMany(pagination, filter, context);
  }
}
