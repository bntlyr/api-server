import { Args, Query, Resolver } from "@nestjs/graphql";
import { CastingDefectService } from "../casting-defect.service.js";
import type {
  CastingDefectFilterInput,
  PaginationInput,
  CastingDefectConnection,
} from "../../../../generated/graphql/types.js";

@Resolver("CastingDefect")
export class CastingDefectQueryResolver {
  constructor(private readonly castingDefectService: CastingDefectService) {}

  @Query("castingDefectById")
  async castingDefectById(@Args("id") id: string) {
    return this.castingDefectService.findOne(id);
  }

  @Query("castingDefectsPaginated")
  async castingDefectsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: CastingDefectFilterInput | null,
  ): Promise<CastingDefectConnection> {
    return this.castingDefectService.findMany(pagination, filter);
  }
}
