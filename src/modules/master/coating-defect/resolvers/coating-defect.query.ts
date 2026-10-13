import { Args, Context, Query, Resolver } from "@nestjs/graphql";
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
  async coatingDefectById(@Args("id") id: string, @Context() context?: any) {
    return this.coatingDefectService.findOne(id, context);
  }

  @Query("coatingDefectsPaginated")
  async coatingDefectsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: CoatingDefectFilterInput | null,
    @Context() context?: any,
  ): Promise<CoatingDefectConnection> {
    return this.coatingDefectService.findMany(pagination, filter, context);
  }
}
