import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { BoxContainerService } from "../box-container.service.js";
import type {
  BoxContainerFilterInput,
  PaginationInput,
  BoxContainerConnection,
} from "../../../../generated/graphql/types.js";

@Resolver("BoxContainer")
export class BoxContainerQueryResolver {
  constructor(private readonly boxContainerService: BoxContainerService) {}

  @Query("boxContainerById")
  async boxContainerById(@Args("id") id: string, @Context() context?: any) {
    return this.boxContainerService.findOne(id, context);
  }

  @Query("boxContainersPaginated")
  async boxContainersPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: BoxContainerFilterInput | null,
    @Context() context?: any,
  ): Promise<BoxContainerConnection> {
    return this.boxContainerService.findMany(pagination, filter, context);
  }

  @Query("openBoxContainers")
  async openBoxContainers(@Args("areaId", { nullable: true }) areaId?: number) {
    return this.boxContainerService.openBoxContainers(areaId);
  }

  @Query("boxContainersBySalesOrder")
  async boxContainersBySalesOrder(@Args("salesOrderId") salesOrderId: number) {
    return this.boxContainerService.boxContainersBySalesOrder(salesOrderId);
  }
}
