import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { MimDefectService } from "../mim-defect.service.js";
import type {
  MimDefectFilterInput,
  PaginationInput,
  MimDefectConnection,
} from "../../../../generated/graphql/types.js";

@Resolver("MimDefect")
export class MimDefectQueryResolver {
  constructor(private readonly mimDefectService: MimDefectService) {}

  @Query("mimDefectById")
  async mimDefectById(@Args("id") id: string, @Context() context?: any) {
    return this.mimDefectService.findOne(id, context);
  }

  @Query("mimDefectsPaginated")
  async mimDefectsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MimDefectFilterInput | null,
    @Context() context?: any,
  ): Promise<MimDefectConnection> {
    return this.mimDefectService.findMany(pagination, filter, context);
  }
}
