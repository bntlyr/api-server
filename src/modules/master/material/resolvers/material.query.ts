import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { MaterialService } from "../material.service.js";
import type {
  MaterialFilterInput,
  PaginationInput,
  MaterialConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("Material")
export class MaterialQueryResolver {
  constructor(private readonly materialService: MaterialService) {}

  @Query("materialById")
  async materialById(@Args("id") id: string, @Context() context?: any) {
    return this.materialService.findOne(id, context);
  }

  @Query("materialsPaginated")
  async materialsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MaterialFilterInput | null,
    @Context() context?: any,
  ): Promise<MaterialConnection> {
    return this.materialService.findMany(pagination, filter, context);
  }
}
