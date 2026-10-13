import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { DefaultRouteService } from "../default-route.service.js";
import type {
  DefaultRouteFilterInput,
  PaginationInput,
  DefaultRouteConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("DefaultRoute")
export class DefaultRouteQueryResolver {
  constructor(private readonly defaultRouteService: DefaultRouteService) {}

  @Query("defaultRouteById")
  async defaultRouteById(@Args("id") id: string, @Context() context?: any) {
    return this.defaultRouteService.findOne(id, context);
  }

  @Query("defaultRoutesPaginated")
  async defaultRoutesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: DefaultRouteFilterInput | null,
    @Context() context?: any,
  ): Promise<DefaultRouteConnection> {
    return this.defaultRouteService.findMany(pagination, filter, context);
  }
}
