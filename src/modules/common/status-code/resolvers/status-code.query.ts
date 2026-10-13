import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { StatusCodeService } from "../status-code.service.js";
import type {
  StatusCodeFilterInput,
  PaginationInput,
  StatusCodeConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("StatusCode")
export class StatusCodeQueryResolver {
  constructor(private readonly statusCodeService: StatusCodeService) {}

  @Query("statusCodeById")
  async statusCodeById(@Args("id") id: string, @Context() context?: any) {
    return this.statusCodeService.findOne(id, context);
  }

  @Query("statusCodesPaginated")
  async statusCodesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: StatusCodeFilterInput | null,
    @Context() context?: any,
  ): Promise<StatusCodeConnection> {
    return this.statusCodeService.findMany(pagination, filter, context);
  }
}
