import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { DefaultRouteMachiningService } from "../default-route-machining.service.js";
import type {
  DefaultRouteMachiningFilterInput,
  PaginationInput,
  DefaultRouteMachiningConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("DefaultRouteMachining")
export class DefaultRouteMachiningQueryResolver {
  constructor(private readonly defaultRouteMachiningService: DefaultRouteMachiningService) {}

  @Query("defaultRouteMachiningById")
  async defaultRouteMachiningById(@Args("id") id: string, @Context() context?: any) {
    return this.defaultRouteMachiningService.findOne(id, context);
  }

  @Query("defaultRouteMachiningsPaginated")
  async defaultRouteMachiningsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: DefaultRouteMachiningFilterInput | null,
    @Context() context?: any,
  ): Promise<DefaultRouteMachiningConnection> {
    return this.defaultRouteMachiningService.findMany(pagination, filter, context);
  }
}
