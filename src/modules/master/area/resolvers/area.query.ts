import { Args, Query, Resolver } from "@nestjs/graphql";
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
  async areaById(@Args("id") id: string) {
    return this.areaService.findOne(id);
  }

  @Query("areasPaginated")
  async areasPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: AreaFilterInput | null,
  ): Promise<AreaConnection> {
    return this.areaService.findMany(pagination, filter);
  }
}
