import { Args, Query, Resolver } from "@nestjs/graphql";
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
  async materialGroupById(@Args("id") id: string) {
    return this.materialGroupService.findOne(id);
  }

  @Query("materialGroupsPaginated")
  async materialGroupsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MaterialGroupFilterInput | null,
  ): Promise<MaterialGroupConnection> {
    return this.materialGroupService.findMany(pagination, filter);
  }
}
