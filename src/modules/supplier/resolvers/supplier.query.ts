import { Args, Query, Resolver } from "@nestjs/graphql";
import { SupplierService } from "../supplier.service.js";
import type {
  SupplierFilterInput,
  PaginationInput,
  SupplierConnection,
} from "../../../generated/graphql/types.js";

@Resolver("Supplier")
export class SupplierQueryResolver {
  constructor(private readonly supplierService: SupplierService) {}

  @Query("supplierById")
  async supplierById(@Args("id") id: string) {
    return this.supplierService.findOne(id);
  }

  @Query("suppliersPaginated")
  async suppliersPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: SupplierFilterInput | null,
  ): Promise<SupplierConnection> {
    return this.supplierService.findMany(pagination, filter);
  }
}
