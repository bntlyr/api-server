import { Args, Query, Resolver } from "@nestjs/graphql";
import { FabDefectService } from "../fab-defect.service.js";
import type {
  FabDefectFilterInput,
  PaginationInput,
  FabDefectConnection,
} from "../../../../generated/graphql/types.js";

@Resolver("FabDefect")
export class FabDefectQueryResolver {
  constructor(private readonly fabDefectService: FabDefectService) {}

  @Query("fabDefectById")
  async fabDefectById(@Args("id") id: string) {
    return this.fabDefectService.findOne(id);
  }

  @Query("fabDefectsPaginated")
  async fabDefectsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: FabDefectFilterInput | null,
  ): Promise<FabDefectConnection> {
    return this.fabDefectService.findMany(pagination, filter);
  }
}
