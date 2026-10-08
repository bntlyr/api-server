import { Args, Query, Resolver } from "@nestjs/graphql";
import { ProcessIterationService } from "../process-iteration.service.js";
import type {
  ProcessIterationFilterInput,
  PaginationInput,
  ProcessIterationConnection,
} from "../../../generated/graphql/types.js";

@Resolver("ProcessIteration")
export class ProcessIterationQueryResolver {
  constructor(private readonly processIterationService: ProcessIterationService) {}

  @Query("processIterationById")
  async processIterationById(@Args("id") id: string) {
    return this.processIterationService.findOne(id);
  }

  @Query("processIterationsPaginated")
  async processIterationsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ProcessIterationFilterInput | null,
  ): Promise<ProcessIterationConnection> {
    return this.processIterationService.findMany(pagination, filter);
  }
}
