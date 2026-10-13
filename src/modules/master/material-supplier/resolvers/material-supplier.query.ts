import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { MaterialSupplierService } from "../material-supplier.service.js";
import type {
  MaterialSupplierFilterInput,
  PaginationInput,
  MaterialSupplierConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("MaterialSupplier")
export class MaterialSupplierQueryResolver {
  constructor(private readonly materialSupplierService: MaterialSupplierService) {}

  @Query("materialSupplierById")
  async materialSupplierById(@Args("id") id: string, @Context() context?: any) {
    return this.materialSupplierService.findOne(id, context);
  }

  @Query("materialSuppliersPaginated")
  async materialSuppliersPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MaterialSupplierFilterInput | null,
    @Context() context?: any,
  ): Promise<MaterialSupplierConnection> {
    return this.materialSupplierService.findMany(pagination, filter, context);
  }
}
