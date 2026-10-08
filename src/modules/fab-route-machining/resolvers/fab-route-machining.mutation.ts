import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { FabRouteMachiningService } from "../fab-route-machining.service.js";
import type {
  CreateFabRouteMachiningInput,
  UpdateFabRouteMachiningInput,
  FabRouteMachiningPayload,
} from "../../../generated/graphql/types.js";

@Resolver("FabRouteMachining")
export class FabRouteMachiningMutationResolver {
  constructor(private readonly fabRouteMachiningService: FabRouteMachiningService) {}

  @Mutation("createFabRouteMachining")
  async createFabRouteMachining(
    @Args("input") input: CreateFabRouteMachiningInput,
    @Context() context: any,
  ): Promise<FabRouteMachiningPayload> {
    return this.fabRouteMachiningService.create(input, context);
  }

  @Mutation("updateFabRouteMachining")
  async updateFabRouteMachining(
    @Args("id") id: string,
    @Args("input") input: UpdateFabRouteMachiningInput,
    @Context() context: any,
  ): Promise<FabRouteMachiningPayload> {
    return this.fabRouteMachiningService.update(id, input, context);
  }

  @Mutation("deleteFabRouteMachining")
  async deleteFabRouteMachining(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<FabRouteMachiningPayload> {
    return this.fabRouteMachiningService.delete(id, context);
  }

  @Mutation("restoreFabRouteMachining")
  async restoreFabRouteMachining(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<FabRouteMachiningPayload> {
    return this.fabRouteMachiningService.restore(id, context);
  }
}
