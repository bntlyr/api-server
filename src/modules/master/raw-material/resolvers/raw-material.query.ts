import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { RawMaterialService } from "../raw-material.service.js";
import type {
  RawMaterialFilterInput,
  PaginationInput,
  RawMaterialConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("RawMaterial")
export class RawMaterialQueryResolver {
  constructor(private readonly rawMaterialService: RawMaterialService) {}

  @Query("rawMaterialById")
  async rawMaterialById(@Args("id") id: string, @Context() context?: any) {
    return this.rawMaterialService.findOne(id, context);
  }

  @Query("rawMaterialsPaginated")
  async rawMaterialsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: RawMaterialFilterInput | null,
    @Context() context?: any,
  ): Promise<RawMaterialConnection> {
    return this.rawMaterialService.findMany(pagination, filter, context);
  }
}
