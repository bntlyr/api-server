import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { PalletTypeService } from "../pallet-type.service.js";
import type {
  PalletTypeFilterInput,
  PaginationInput,
  PalletTypeConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("PalletType")
export class PalletTypeQueryResolver {
  constructor(private readonly palletTypeService: PalletTypeService) {}

  @Query("palletTypeById")
  async palletTypeById(@Args("id") id: string, @Context() context?: any) {
    return this.palletTypeService.findOne(id, context);
  }

  @Query("palletTypesPaginated")
  async palletTypesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: PalletTypeFilterInput | null,
    @Context() context?: any,
  ): Promise<PalletTypeConnection> {
    return this.palletTypeService.findMany(pagination, filter, context);
  }
}
