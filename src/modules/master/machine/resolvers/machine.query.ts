import { Args, Query, Resolver } from "@nestjs/graphql";
import { MachineService } from "../machine.service.js";
import type {
  MachineFilterInput,
  PaginationInput,
  MachineConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("Machine")
export class MachineQueryResolver {
  constructor(private readonly machineService: MachineService) {}

  @Query("machineById")
  async machineById(@Args("id") id: string) {
    return this.machineService.findOne(id);
  }

  @Query("machinesPaginated")
  async machinesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MachineFilterInput | null,
  ): Promise<MachineConnection> {
    return this.machineService.findMany(pagination, filter);
  }
}
