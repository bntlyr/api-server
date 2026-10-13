import { Args, Context, Query, Resolver } from "@nestjs/graphql";
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
  async fabDefectById(@Args("id") id: string, @Context() context?: any) {
    return this.fabDefectService.findOne(id, context);
  }

  @Query("fabDefectsPaginated")
  async fabDefectsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: FabDefectFilterInput | null,
    @Context() context?: any,
  ): Promise<FabDefectConnection> {
    return this.fabDefectService.findMany(pagination, filter, context);
  }
}
