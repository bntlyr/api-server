import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { LocationService } from "../location.service.js";
import type {
  CreateLocationInput,
  UpdateLocationInput,
  LocationPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("Location")
export class LocationMutationResolver {
  constructor(private readonly locationService: LocationService) {}

  @Mutation("createLocation")
  async createLocation(
    @Args("input") input: CreateLocationInput,
    @Context() context: any,
  ): Promise<LocationPayload> {
    return this.locationService.create(input, context);
  }

  @Mutation("updateLocation")
  async updateLocation(
    @Args("id") id: string,
    @Args("input") input: UpdateLocationInput,
    @Context() context: any,
  ): Promise<LocationPayload> {
    return this.locationService.update(id, input, context);
  }

  @Mutation("deleteLocation")
  async deleteLocation(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<LocationPayload> {
    return this.locationService.delete(id, context);
  }

  @Mutation("restoreLocation")
  async restoreLocation(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<LocationPayload> {
    return this.locationService.restore(id, context);
  }
}
