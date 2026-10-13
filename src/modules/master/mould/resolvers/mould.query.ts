import { Args, Context, Query, Resolver } from "@nestjs/graphql";
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
  async mouldById(@Args("id") id: string, @Context() context?: any) {
    return this.mouldService.findOne(id, context);
  }

  @Query("mouldsPaginated")
  async mouldsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MouldFilterInput | null,
    @Context() context?: any,
  ): Promise<MouldConnection> {
    return this.mouldService.findMany(pagination, filter, context);
  }
}
