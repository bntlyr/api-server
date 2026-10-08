import { Args, Query, Resolver } from "@nestjs/graphql";
import { ItemRouteStepService } from "../item-route-step.service.js";
import type {
  ItemRouteStepFilterInput,
  PaginationInput,
  ItemRouteStepConnection,
} from "../../../generated/graphql/types.js";

@Resolver("ItemRouteStep")
export class ItemRouteStepQueryResolver {
  constructor(private readonly itemRouteStepService: ItemRouteStepService) {}

  @Query("itemRouteStepById")
  async itemRouteStepById(@Args("id") id: string) {
    return this.itemRouteStepService.findOne(id);
  }

  @Query("itemRouteStepsPaginated")
  async itemRouteStepsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ItemRouteStepFilterInput | null,
  ): Promise<ItemRouteStepConnection> {
    return this.itemRouteStepService.findMany(pagination, filter);
  }
}
