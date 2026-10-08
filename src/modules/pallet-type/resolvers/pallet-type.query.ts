import { Args, Query, Resolver } from "@nestjs/graphql";
import { PalletTypeService } from "../pallet-type.service.js";
import type {
  PalletTypeFilterInput,
  PaginationInput,
  PalletTypeConnection,
} from "../../../generated/graphql/types.js";

@Resolver("PalletType")
export class PalletTypeQueryResolver {
  constructor(private readonly palletTypeService: PalletTypeService) {}

  @Query("palletTypeById")
  async palletTypeById(@Args("id") id: string) {
    return this.palletTypeService.findOne(id);
  }

  @Query("palletTypesPaginated")
  async palletTypesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: PalletTypeFilterInput | null,
  ): Promise<PalletTypeConnection> {
    return this.palletTypeService.findMany(pagination, filter);
  }
}
