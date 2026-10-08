import { Args, Query, Resolver } from "@nestjs/graphql";
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
  async defaultRouteMachiningById(@Args("id") id: string) {
    return this.defaultRouteMachiningService.findOne(id);
  }

  @Query("defaultRouteMachiningsPaginated")
  async defaultRouteMachiningsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: DefaultRouteMachiningFilterInput | null,
  ): Promise<DefaultRouteMachiningConnection> {
    return this.defaultRouteMachiningService.findMany(pagination, filter);
  }
}
