import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { MaterialGroupService } from "../material-group.service.js";
import type {
  MaterialGroupFilterInput,
  PaginationInput,
  MaterialGroupConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("MaterialGroup")
export class MaterialGroupQueryResolver {
  constructor(private readonly materialGroupService: MaterialGroupService) {}

  @Query("materialGroupById")
  async materialGroupById(@Args("id") id: string, @Context() context?: any) {
    return this.materialGroupService.findOne(id, context);
  }

  @Query("materialGroupsPaginated")
  async materialGroupsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MaterialGroupFilterInput | null,
    @Context() context?: any,
  ): Promise<MaterialGroupConnection> {
    return this.materialGroupService.findMany(pagination, filter, context);
  }
}
