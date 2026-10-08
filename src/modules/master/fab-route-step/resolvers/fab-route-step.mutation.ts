import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { FabRouteStepService } from "../fab-route-step.service.js";
import type {
  CreateFabRouteStepInput,
  UpdateFabRouteStepInput,
  FabRouteStepPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("FabRouteStep")
export class FabRouteStepMutationResolver {
  constructor(private readonly fabRouteStepService: FabRouteStepService) {}

  @Mutation("createFabRouteStep")
  async createFabRouteStep(
    @Args("input") input: CreateFabRouteStepInput,
    @Context() context: any,
  ): Promise<FabRouteStepPayload> {
    return this.fabRouteStepService.create(input, context);
  }

  @Mutation("updateFabRouteStep")
  async updateFabRouteStep(
    @Args("id") id: string,
    @Args("input") input: UpdateFabRouteStepInput,
    @Context() context: any,
  ): Promise<FabRouteStepPayload> {
    return this.fabRouteStepService.update(id, input, context);
  }

  @Mutation("deleteFabRouteStep")
  async deleteFabRouteStep(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<FabRouteStepPayload> {
    return this.fabRouteStepService.delete(id, context);
  }

  @Mutation("restoreFabRouteStep")
  async restoreFabRouteStep(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<FabRouteStepPayload> {
    return this.fabRouteStepService.restore(id, context);
  }
}
