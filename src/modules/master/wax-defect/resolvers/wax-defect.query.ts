import { Args, Query, Resolver } from "@nestjs/graphql";
import { WaxDefectService } from "../wax-defect.service.js";
import type {
  WaxDefectFilterInput,
  PaginationInput,
  WaxDefectConnection,
} from "../../../../generated/graphql/types.js";

@Resolver("WaxDefect")
export class WaxDefectQueryResolver {
  constructor(private readonly waxDefectService: WaxDefectService) {}

  @Query("waxDefectById")
  async waxDefectById(@Args("id") id: string) {
    return this.waxDefectService.findOne(id);
  }

  @Query("waxDefectsPaginated")
  async waxDefectsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: WaxDefectFilterInput | null,
  ): Promise<WaxDefectConnection> {
    return this.waxDefectService.findMany(pagination, filter);
  }
}
