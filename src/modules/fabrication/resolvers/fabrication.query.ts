import { Args, Query, Resolver } from "@nestjs/graphql";
import { FabricationService } from "../fabrication.service.js";
import type {
  FabricationFilterInput,
  PaginationInput,
  FabricationConnection,
} from "../../../generated/graphql/types.js";

@Resolver("Fabrication")
export class FabricationQueryResolver {
  constructor(private readonly fabricationService: FabricationService) {}

  @Query("fabricationById")
  async fabricationById(@Args("id") id: string) {
    return this.fabricationService.findOne(id);
  }

  @Query("fabricationsPaginated")
  async fabricationsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: FabricationFilterInput | null,
  ): Promise<FabricationConnection> {
    return this.fabricationService.findMany(pagination, filter);
  }
}
