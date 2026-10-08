import { Args, Query, Resolver } from "@nestjs/graphql";
import { PositionService } from "../position.service.js";
import type {
  PositionFilterInput,
  PaginationInput,
  PositionConnection,
} from "../../../generated/graphql/types.js";

@Resolver("Position")
export class PositionQueryResolver {
  constructor(private readonly positionService: PositionService) {}

  @Query("positionById")
  async positionById(@Args("id") id: string) {
    return this.positionService.findOne(id);
  }

  @Query("positionsPaginated")
  async positionsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: PositionFilterInput | null,
  ): Promise<PositionConnection> {
    return this.positionService.findMany(pagination, filter);
  }
}
