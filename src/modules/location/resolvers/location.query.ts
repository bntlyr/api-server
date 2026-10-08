import { Args, Query, Resolver } from "@nestjs/graphql";
import { LocationService } from "../location.service.js";
import type {
  LocationFilterInput,
  PaginationInput,
  LocationConnection,
} from "../../../generated/graphql/types.js";

@Resolver("Location")
export class LocationQueryResolver {
  constructor(private readonly locationService: LocationService) {}

  @Query("locationById")
  async locationById(@Args("id") id: string) {
    return this.locationService.findOne(id);
  }

  @Query("locationsPaginated")
  async locationsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: LocationFilterInput | null,
  ): Promise<LocationConnection> {
    return this.locationService.findMany(pagination, filter);
  }
}
