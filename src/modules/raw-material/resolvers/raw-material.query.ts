import { Args, Query, Resolver } from "@nestjs/graphql";
import { RawMaterialService } from "../raw-material.service.js";
import type {
  RawMaterialFilterInput,
  PaginationInput,
  RawMaterialConnection,
} from "../../../generated/graphql/types.js";

@Resolver("RawMaterial")
export class RawMaterialQueryResolver {
  constructor(private readonly rawMaterialService: RawMaterialService) {}

  @Query("rawMaterialById")
  async rawMaterialById(@Args("id") id: string) {
    return this.rawMaterialService.findOne(id);
  }

  @Query("rawMaterialsPaginated")
  async rawMaterialsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: RawMaterialFilterInput | null,
  ): Promise<RawMaterialConnection> {
    return this.rawMaterialService.findMany(pagination, filter);
  }
}
