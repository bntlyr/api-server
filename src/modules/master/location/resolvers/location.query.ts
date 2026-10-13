import { Args, Context, Query, Resolver } from "@nestjs/graphql";
import { LocationService } from "../location.service.js";
import type {
  LocationFilterInput,
  PaginationInput,
  LocationConnection,
} from "../../../../generated//graphql/types.js";

@Resolver("Location")
export class LocationQueryResolver {
  constructor(private readonly locationService: LocationService) {}

  @Query("locationById")
  async locationById(@Args("id") id: string, @Context() context?: any) {
    return this.locationService.findOne(id, context);
  }

  @Query("locationsPaginated")
  async locationsPaginated(
    @Args("pagination", { nullable: true }) pagination?: PaginationInput | null,
    @Args("filter", { nullable: true }) filter?: LocationFilterInput | null,
    @Context() context?: any,
  ): Promise<LocationConnection> {
    return this.locationService.findMany(pagination, filter, context);
  }
}
