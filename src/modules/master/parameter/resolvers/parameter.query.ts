import { Args, Query, Resolver } from "@nestjs/graphql";
import { ParameterService } from "../parameter.service.js";
import type {
  ParameterFilterInput,
  PaginationInput,
  ParameterConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("Parameter")
export class ParameterQueryResolver {
  constructor(private readonly parameterService: ParameterService) {}

  @Query("parameterById")
  async parameterById(@Args("id") id: string) {
    return this.parameterService.findOne(id);
  }

  @Query("parametersPaginated")
  async parametersPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: ParameterFilterInput | null,
  ): Promise<ParameterConnection> {
    return this.parameterService.findMany(pagination, filter);
  }
}
