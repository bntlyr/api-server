import { Args, Query, Resolver } from "@nestjs/graphql";
import { CoatingDefectService } from "../coating-defect.service.js";
import type {
  CoatingDefectFilterInput,
  PaginationInput,
  CoatingDefectConnection,
} from "../../../../generated/graphql/types.js";

@Resolver("CoatingDefect")
export class CoatingDefectQueryResolver {
  constructor(private readonly coatingDefectService: CoatingDefectService) {}

  @Query("coatingDefectById")
  async coatingDefectById(@Args("id") id: string) {
    return this.coatingDefectService.findOne(id);
  }

  @Query("coatingDefectsPaginated")
  async coatingDefectsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: CoatingDefectFilterInput | null,
  ): Promise<CoatingDefectConnection> {
    return this.coatingDefectService.findMany(pagination, filter);
  }
}
