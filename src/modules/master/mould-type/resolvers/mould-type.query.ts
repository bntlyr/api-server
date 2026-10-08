import { Args, Query, Resolver } from "@nestjs/graphql";
import { MouldTypeService } from "../mould-type.service.js";
import type {
  MouldTypeFilterInput,
  PaginationInput,
  MouldTypeConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("MouldType")
export class MouldTypeQueryResolver {
  constructor(private readonly mouldTypeService: MouldTypeService) {}

  @Query("mouldTypeById")
  async mouldTypeById(@Args("id") id: string) {
    return this.mouldTypeService.findOne(id);
  }

  @Query("mouldTypesPaginated")
  async mouldTypesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MouldTypeFilterInput | null,
  ): Promise<MouldTypeConnection> {
    return this.mouldTypeService.findMany(pagination, filter);
  }
}
