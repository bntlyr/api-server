import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { MaterialIssuanceService } from "../material-issuance.service.js";
import type {
  MaterialIssuanceConnection,
  MaterialIssuanceFilterInput,
  PaginationInput,
} from "../../../../generated/graphql/types.js";

@Resolver("MaterialIssuance")
export class MaterialIssuanceQueryResolver {
  constructor(private readonly service: MaterialIssuanceService) {}

  @Query("materialIssuanceById")
  async materialIssuanceById(@Args("id") id: string, @Context() context?: any) {
    return this.service.findOne(id, context);
  }

  @Query("materialIssuancesPaginated")
  async materialIssuancesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MaterialIssuanceFilterInput | null,
    @Context() context?: any,
  ): Promise<MaterialIssuanceConnection> {
    return this.service.findMany(pagination, filter, context);
  }
}
