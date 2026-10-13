import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { ToolService } from "../tool.service.js";
import type {
  ToolFilterInput,
  PaginationInput,
  ToolConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("Tool")
export class ToolQueryResolver {
  constructor(private readonly toolService: ToolService) {}

  @Query("toolById")
  async toolById(@Args("id") id: string, @Context() context?: any) {
    return this.toolService.findOne(id, context);
  }

  @Query("toolsPaginated")
  async toolsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ToolFilterInput | null,
    @Context() context?: any,
  ): Promise<ToolConnection> {
    return this.toolService.findMany(pagination, filter, context);
  }
}
