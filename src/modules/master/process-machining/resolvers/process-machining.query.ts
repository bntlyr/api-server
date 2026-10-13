import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { ProcessMachiningService } from "../process-machining.service.js";
import type {
  ProcessMachiningFilterInput,
  PaginationInput,
  ProcessMachiningConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("ProcessMachining")
export class ProcessMachiningQueryResolver {
  constructor(private readonly processMachiningService: ProcessMachiningService) {}

  @Query("processMachiningById")
  async processMachiningById(@Args("id") id: string, @Context() context?: any) {
    return this.processMachiningService.findOne(id, context);
  }

  @Query("processMachiningsPaginated")
  async processMachiningsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ProcessMachiningFilterInput | null,
    @Context() context?: any,
  ): Promise<ProcessMachiningConnection> {
    return this.processMachiningService.findMany(pagination, filter, context);
  }
}
