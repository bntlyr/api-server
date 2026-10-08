import { Args, Query, Resolver } from "@nestjs/graphql";
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
  async defaultRouteStepById(@Args("id") id: string) {
    return this.defaultRouteStepService.findOne(id);
  }

  @Query("defaultRouteStepsPaginated")
  async defaultRouteStepsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: DefaultRouteStepFilterInput | null,
  ): Promise<DefaultRouteStepConnection> {
    return this.defaultRouteStepService.findMany(pagination, filter);
  }
}
