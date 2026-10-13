import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { SalesOrderService } from "../sales-order.service.js";
import type {
  SalesOrderConnection,
  SalesOrderFilterInput,
  PaginationInput,
} from "../../../../generated/graphql/types.js";

@Resolver("SalesOrder")
export class SalesOrderQueryResolver {
  constructor(private readonly service: SalesOrderService) {}

  @Query("salesOrderById")
  async salesOrderById(@Args("id") id: string) {
    return this.service.findById(id);
  }

  @Query("salesOrderByOrderNo")
  async salesOrderByOrderNo(@Args("orderNo") orderNo: string) {
    return this.service.findByOrderNo(orderNo);
  }

  @Query("salesOrdersPaginated")
  async salesOrdersPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: SalesOrderFilterInput | null,
  ): Promise<SalesOrderConnection> {
    return this.service.findPaginated(pagination, filter);
  }
}
