import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { AreaService } from "../area.service.js";
import type {
  AreaFilterInput,
  PaginationInput,
  AreaConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("Area")
export class AreaQueryResolver {
  constructor(private readonly areaService: AreaService) {}

  @Query("areaById")
  async areaById(@Args("id") id: string, @Context() context?: any) {
    return this.areaService.findOne(id, context);
  }

  @Query("areasPaginated")
  async areasPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: AreaFilterInput | null,
    @Context() context?: any,
  ): Promise<AreaConnection> {
    return this.areaService.findMany(pagination, filter, context);
  }
}
