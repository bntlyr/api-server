import { Args, Query, Resolver } from "@nestjs/graphql";
import { RawMaterialRotationService } from "../raw-material-rotation.service.js";
import type {
  RawMaterialRotationFilterInput,
  PaginationInput,
  RawMaterialRotationConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("RawMaterialRotation")
export class RawMaterialRotationQueryResolver {
  constructor(private readonly rawMaterialRotationService: RawMaterialRotationService) {}

  @Query("rawMaterialRotationById")
  async rawMaterialRotationById(@Args("id") id: string) {
    return this.rawMaterialRotationService.findOne(id);
  }

  @Query("rawMaterialRotationsPaginated")
  async rawMaterialRotationsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: RawMaterialRotationFilterInput | null,
  ): Promise<RawMaterialRotationConnection> {
    return this.rawMaterialRotationService.findMany(pagination, filter);
  }
}
