import { Args, Query, Resolver } from "@nestjs/graphql";
import { MachineTypeService } from "../machine-type.service.js";
import type {
  MachineTypeFilterInput,
  PaginationInput,
  MachineTypeConnection,
} from "../../../generated/graphql/types.js";

@Resolver("MachineType")
export class MachineTypeQueryResolver {
  constructor(private readonly machineTypeService: MachineTypeService) {}

  @Query("machineTypeById")
  async machineTypeById(@Args("id") id: string) {
    return this.machineTypeService.findOne(id);
  }

  @Query("machineTypesPaginated")
  async machineTypesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MachineTypeFilterInput | null,
  ): Promise<MachineTypeConnection> {
    return this.machineTypeService.findMany(pagination, filter);
  }
}
