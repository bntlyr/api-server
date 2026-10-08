import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { FabRouteIterationService } from "../fab-route-iteration.service.js";
import type {
  CreateFabRouteIterationInput,
  UpdateFabRouteIterationInput,
  FabRouteIterationPayload,
} from "../../../generated/graphql/types.js";

@Resolver("FabRouteIteration")
export class FabRouteIterationMutationResolver {
  constructor(private readonly fabRouteIterationService: FabRouteIterationService) {}

  @Mutation("createFabRouteIteration")
  async createFabRouteIteration(
    @Args("input") input: CreateFabRouteIterationInput,
    @Context() context: any,
  ): Promise<FabRouteIterationPayload> {
    return this.fabRouteIterationService.create(input, context);
  }

  @Mutation("updateFabRouteIteration")
  async updateFabRouteIteration(
    @Args("id") id: string,
    @Args("input") input: UpdateFabRouteIterationInput,
    @Context() context: any,
  ): Promise<FabRouteIterationPayload> {
    return this.fabRouteIterationService.update(id, input, context);
  }

  @Mutation("deleteFabRouteIteration")
  async deleteFabRouteIteration(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<FabRouteIterationPayload> {
    return this.fabRouteIterationService.delete(id, context);
  }

  @Mutation("restoreFabRouteIteration")
  async restoreFabRouteIteration(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<FabRouteIterationPayload> {
    return this.fabRouteIterationService.restore(id, context);
  }
}
