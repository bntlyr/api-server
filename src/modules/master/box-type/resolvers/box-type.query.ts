import { Args, Query, Resolver } from "@nestjs/graphql";
import { BoxTypeService } from "../box-type.service.js";
import type {
  BoxTypeFilterInput,
  PaginationInput,
  BoxTypeConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("BoxType")
export class BoxTypeQueryResolver {
  constructor(private readonly boxTypeService: BoxTypeService) {}

  @Query("boxTypeById")
  async boxTypeById(@Args("id") id: string) {
    return this.boxTypeService.findOne(id);
  }

  @Query("boxTypesPaginated")
  async boxTypesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: BoxTypeFilterInput | null,
  ): Promise<BoxTypeConnection> {
    return this.boxTypeService.findMany(pagination, filter);
  }
}
