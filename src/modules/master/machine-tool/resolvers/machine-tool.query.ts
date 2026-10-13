import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { MachineToolService } from "../machine-tool.service.js";
import type {
  MachineToolFilterInput,
  PaginationInput,
  MachineToolConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("MachineTool")
export class MachineToolQueryResolver {
  constructor(private readonly machineToolService: MachineToolService) {}

  @Query("machineToolById")
  async machineToolById(@Args("id") id: string, @Context() context?: any) {
    return this.machineToolService.findOne(id, context);
  }

  @Query("machineToolsPaginated")
  async machineToolsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MachineToolFilterInput | null,
    @Context() context?: any,
  ): Promise<MachineToolConnection> {
    return this.machineToolService.findMany(pagination, filter, context);
  }
}
