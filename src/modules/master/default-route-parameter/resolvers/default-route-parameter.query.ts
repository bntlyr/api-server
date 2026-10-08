import { Args, Query, Resolver } from "@nestjs/graphql";
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
  async defaultRouteParameterById(@Args("id") id: string) {
    return this.defaultRouteParameterService.findOne(id);
  }

  @Query("defaultRouteParametersPaginated")
  async defaultRouteParametersPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: DefaultRouteParameterFilterInput | null,
  ): Promise<DefaultRouteParameterConnection> {
    return this.defaultRouteParameterService.findMany(pagination, filter);
  }
}
