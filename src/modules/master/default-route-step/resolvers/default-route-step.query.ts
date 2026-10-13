import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { DefaultRouteStepService } from "../default-route-step.service.js";
import type {
  DefaultRouteStepFilterInput,
  PaginationInput,
  DefaultRouteStepConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("DefaultRouteStep")
export class DefaultRouteStepQueryResolver {
  constructor(private readonly defaultRouteStepService: DefaultRouteStepService) {}

  @Query("defaultRouteStepById")
  async defaultRouteStepById(@Args("id") id: string, @Context() context?: any) {
    return this.defaultRouteStepService.findOne(id, context);
  }

  @Query("defaultRouteStepsPaginated")
  async defaultRouteStepsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: DefaultRouteStepFilterInput | null,
    @Context() context?: any,
  ): Promise<DefaultRouteStepConnection> {
    return this.defaultRouteStepService.findMany(pagination, filter, context);
  }
}
