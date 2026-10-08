import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { FabRouteService } from "../fab-route.service.js";
import type {
  CreateFabRouteInput,
  UpdateFabRouteInput,
  FabRoutePayload,
} from "../../../generated/graphql/types.js";

@Resolver("FabRoute")
export class FabRouteMutationResolver {
  constructor(private readonly fabRouteService: FabRouteService) {}

  @Mutation("createFabRoute")
  async createFabRoute(
    @Args("input") input: CreateFabRouteInput,
    @Context() context: any,
  ): Promise<FabRoutePayload> {
    return this.fabRouteService.create(input, context);
  }

  @Mutation("updateFabRoute")
  async updateFabRoute(
    @Args("id") id: string,
    @Args("input") input: UpdateFabRouteInput,
    @Context() context: any,
  ): Promise<FabRoutePayload> {
    return this.fabRouteService.update(id, input, context);
  }

  @Mutation("deleteFabRoute")
  async deleteFabRoute(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<FabRoutePayload> {
    return this.fabRouteService.delete(id, context);
  }

  @Mutation("restoreFabRoute")
  async restoreFabRoute(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<FabRoutePayload> {
    return this.fabRouteService.restore(id, context);
  }
}
