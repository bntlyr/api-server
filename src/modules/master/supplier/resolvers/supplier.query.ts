import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { SupplierService } from "../supplier.service.js";
import type {
  SupplierFilterInput,
  PaginationInput,
  SupplierConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("Supplier")
export class SupplierQueryResolver {
  constructor(private readonly supplierService: SupplierService) {}

  @Query("supplierById")
  async supplierById(@Args("id") id: string, @Context() context?: any) {
    return this.supplierService.findOne(id, context);
  }

  @Query("suppliersPaginated")
  async suppliersPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: SupplierFilterInput | null,
    @Context() context?: any,
  ): Promise<SupplierConnection> {
    return this.supplierService.findMany(pagination, filter, context);
  }
}
