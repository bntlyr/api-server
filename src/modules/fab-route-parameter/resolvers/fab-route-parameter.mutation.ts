import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { FabRouteParameterService } from "../fab-route-parameter.service.js";
import type {
  CreateFabRouteParameterInput,
  UpdateFabRouteParameterInput,
  FabRouteParameterPayload,
} from "../../../generated/graphql/types.js";

@Resolver("FabRouteParameter")
export class FabRouteParameterMutationResolver {
  constructor(private readonly fabRouteParameterService: FabRouteParameterService) {}

  @Mutation("createFabRouteParameter")
  async createFabRouteParameter(
    @Args("input") input: CreateFabRouteParameterInput,
    @Context() context: any,
  ): Promise<FabRouteParameterPayload> {
    return this.fabRouteParameterService.create(input, context);
  }

  @Mutation("updateFabRouteParameter")
  async updateFabRouteParameter(
    @Args("id") id: string,
    @Args("input") input: UpdateFabRouteParameterInput,
    @Context() context: any,
  ): Promise<FabRouteParameterPayload> {
    return this.fabRouteParameterService.update(id, input, context);
  }

  @Mutation("deleteFabRouteParameter")
  async deleteFabRouteParameter(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<FabRouteParameterPayload> {
    return this.fabRouteParameterService.delete(id, context);
  }

  @Mutation("restoreFabRouteParameter")
  async restoreFabRouteParameter(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<FabRouteParameterPayload> {
    return this.fabRouteParameterService.restore(id, context);
  }
}
