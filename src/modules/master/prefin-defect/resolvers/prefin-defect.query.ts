import { Args, Query, Resolver } from "@nestjs/graphql";
import { PrefinDefectService } from "../prefin-defect.service.js";
import type {
  PrefinDefectFilterInput,
  PaginationInput,
  PrefinDefectConnection,
} from "../../../../generated/graphql/types.js";

@Resolver("PrefinDefect")
export class PrefinDefectQueryResolver {
  constructor(private readonly prefinDefectService: PrefinDefectService) {}

  @Query("prefinDefectById")
  async prefinDefectById(@Args("id") id: string) {
    return this.prefinDefectService.findOne(id);
  }

  @Query("prefinDefectsPaginated")
  async prefinDefectsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: PrefinDefectFilterInput | null,
  ): Promise<PrefinDefectConnection> {
    return this.prefinDefectService.findMany(pagination, filter);
  }
}
