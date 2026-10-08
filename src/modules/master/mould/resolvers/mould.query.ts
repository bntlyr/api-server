import { Args, Query, Resolver } from "@nestjs/graphql";
import { MouldService } from "../mould.service.js";
import type {
  MouldFilterInput,
  PaginationInput,
  MouldConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("Mould")
export class MouldQueryResolver {
  constructor(private readonly mouldService: MouldService) {}

  @Query("mouldById")
  async mouldById(@Args("id") id: string) {
    return this.mouldService.findOne(id);
  }

  @Query("mouldsPaginated")
  async mouldsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MouldFilterInput | null,
  ): Promise<MouldConnection> {
    return this.mouldService.findMany(pagination, filter);
  }
}
