import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { CustomerService } from "../customer.service.js";
import type {
  CustomerFilterInput,
  PaginationInput,
  CustomerConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("Customer")
export class CustomerQueryResolver {
  constructor(private readonly customerService: CustomerService) {}

  @Query("customerById")
  async customerById(@Args("id") id: string, @Context() context?: any) {
    return this.customerService.findOne(id, context);
  }

  @Query("customersPaginated")
  async customersPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: CustomerFilterInput | null,
    @Context() context?: any,
  ): Promise<CustomerConnection> {
    return this.customerService.findMany(pagination, filter, context);
  }
}
