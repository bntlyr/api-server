import { Args, Query, Resolver } from "@nestjs/graphql";
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
  async materialIssuanceById(@Args("id") id: string) {
    return this.service.findOne(id);
  }

  @Query("materialIssuancesPaginated")
  async materialIssuancesPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: MaterialIssuanceFilterInput | null,
  ): Promise<MaterialIssuanceConnection> {
    return this.service.findMany(pagination, filter);
  }
}
