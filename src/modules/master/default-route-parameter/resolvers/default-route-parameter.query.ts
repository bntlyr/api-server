import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { DefaultRouteParameterService } from "../default-route-parameter.service.js";
import type {
  DefaultRouteParameterFilterInput,
  PaginationInput,
  DefaultRouteParameterConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("DefaultRouteParameter")
export class DefaultRouteParameterQueryResolver {
  constructor(private readonly defaultRouteParameterService: DefaultRouteParameterService) {}

  @Query("defaultRouteParameterById")
  async defaultRouteParameterById(@Args("id") id: string, @Context() context?: any) {
    return this.defaultRouteParameterService.findOne(id, context);
  }

  @Query("defaultRouteParametersPaginated")
  async defaultRouteParametersPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: DefaultRouteParameterFilterInput | null,
    @Context() context?: any,
  ): Promise<DefaultRouteParameterConnection> {
    return this.defaultRouteParameterService.findMany(pagination, filter, context);
  }
}
