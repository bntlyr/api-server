import { Args, Query, Resolver } from "@nestjs/graphql";
import { MeltingService } from "../melting.service.js";
import type {
  MeltingFilterInput,
  PaginationInput,
  MeltingConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("Melting")
export class MeltingQueryResolver {
  constructor(private readonly meltingService: MeltingService) {}

  @Query("meltingById")
  async meltingById(@Args("id") id: string) {
    return this.meltingService.findOne(id);
  }

  @Query("meltingsPaginated")
  async meltingsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MeltingFilterInput | null,
  ): Promise<MeltingConnection> {
    return this.meltingService.findMany(pagination, filter);
  }
}
