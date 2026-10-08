import { Args, Query, Resolver } from "@nestjs/graphql";
import { StatusCodeService } from "../status-code.service.js";
import type {
  StatusCodeFilterInput,
  PaginationInput,
  StatusCodeConnection,
} from "../../../generated/graphql/types.js";

@Resolver("StatusCode")
export class StatusCodeQueryResolver {
  constructor(private readonly statusCodeService: StatusCodeService) {}

  @Query("statusCodeById")
  async statusCodeById(@Args("id") id: string) {
    return this.statusCodeService.findOne(id);
  }

  @Query("statusCodesPaginated")
  async statusCodesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: StatusCodeFilterInput | null,
  ): Promise<StatusCodeConnection> {
    return this.statusCodeService.findMany(pagination, filter);
  }
}
