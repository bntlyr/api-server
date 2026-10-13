import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { BoxContainerItemService } from "../box-container-item.service.js";
import type {
  BoxContainerItemFilterInput,
  PaginationInput,
  BoxContainerItemConnection,
} from "../../../../generated/graphql/types.js";

@Resolver("BoxContainerItem")
export class BoxContainerItemQueryResolver {
  constructor(private readonly boxContainerItemService: BoxContainerItemService) {}

  @Query("boxContainerItemById")
  async boxContainerItemById(@Args("id") id: string, @Context() context?: any) {
    return this.boxContainerItemService.findOne(id, context);
  }

  @Query("boxContainerItemsPaginated")
  async boxContainerItemsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: BoxContainerItemFilterInput | null,
    @Context() context?: any,
  ): Promise<BoxContainerItemConnection> {
    return this.boxContainerItemService.findMany(pagination, filter, context);
  }
}
