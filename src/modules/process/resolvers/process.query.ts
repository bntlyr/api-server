import { Args, Query, Resolver } from "@nestjs/graphql";
import { ProcessService } from "../process.service.js";
import type {
  ProcessFilterInput,
  PaginationInput,
  ProcessConnection,
} from "../../../generated/graphql/types.js";

@Resolver("Process")
export class ProcessQueryResolver {
  constructor(private readonly processService: ProcessService) {}

  @Query("processById")
  async processById(@Args("id") id: string) {
    return this.processService.findOne(id);
  }

  @Query("processesPaginated")
  async processesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ProcessFilterInput | null,
  ): Promise<ProcessConnection> {
    return this.processService.findMany(pagination, filter);
  }
}
