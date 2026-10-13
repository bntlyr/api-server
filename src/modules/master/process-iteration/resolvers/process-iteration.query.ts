import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { ProcessIterationService } from "../process-iteration.service.js";
import type {
  ProcessIterationFilterInput,
  PaginationInput,
  ProcessIterationConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("ProcessIteration")
export class ProcessIterationQueryResolver {
  constructor(private readonly processIterationService: ProcessIterationService) {}

  @Query("processIterationById")
  async processIterationById(@Args("id") id: string, @Context() context?: any) {
    return this.processIterationService.findOne(id, context);
  }

  @Query("processIterationsPaginated")
  async processIterationsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ProcessIterationFilterInput | null,
    @Context() context?: any,
  ): Promise<ProcessIterationConnection> {
    return this.processIterationService.findMany(pagination, filter, context);
  }
}
