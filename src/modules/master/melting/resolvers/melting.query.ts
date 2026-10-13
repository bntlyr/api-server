import { Args, Context, Query, Resolver } from "@nestjs/graphql";
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
  async meltingById(@Args("id") id: string, @Context() context?: any) {
    return this.meltingService.findOne(id, context);
  }

  @Query("meltingsPaginated")
  async meltingsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MeltingFilterInput | null,
    @Context() context?: any,
  ): Promise<MeltingConnection> {
    return this.meltingService.findMany(pagination, filter, context);
  }
}
