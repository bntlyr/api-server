import { Args, Query, Resolver } from "@nestjs/graphql";
import { DefaultRouteService } from "../default-route.service.js";
import type {
  DefaultRouteFilterInput,
  PaginationInput,
  DefaultRouteConnection,
} from "../../../generated/graphql/types.js";

@Resolver("DefaultRoute")
export class DefaultRouteQueryResolver {
  constructor(private readonly defaultRouteService: DefaultRouteService) {}

  @Query("defaultRouteById")
  async defaultRouteById(@Args("id") id: string) {
    return this.defaultRouteService.findOne(id);
  }

  @Query("defaultRoutesPaginated")
  async defaultRoutesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: DefaultRouteFilterInput | null,
  ): Promise<DefaultRouteConnection> {
    return this.defaultRouteService.findMany(pagination, filter);
  }
}
