import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { DefaultRouteStepService } from "../default-route-step.service.js";
import type {
  CreateDefaultRouteStepInput,
  UpdateDefaultRouteStepInput,
  DefaultRouteStepPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("DefaultRouteStep")
export class DefaultRouteStepMutationResolver {
  constructor(private readonly defaultRouteStepService: DefaultRouteStepService) {}

  @Mutation("createDefaultRouteStep")
  async createDefaultRouteStep(
    @Args("input") input: CreateDefaultRouteStepInput,
    @Context() context: any,
  ): Promise<DefaultRouteStepPayload> {
    return this.defaultRouteStepService.create(input, context);
  }

  @Mutation("updateDefaultRouteStep")
  async updateDefaultRouteStep(
    @Args("id") id: string,
    @Args("input") input: UpdateDefaultRouteStepInput,
    @Context() context: any,
  ): Promise<DefaultRouteStepPayload> {
    return this.defaultRouteStepService.update(id, input, context);
  }

  @Mutation("deleteDefaultRouteStep")
  async deleteDefaultRouteStep(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<DefaultRouteStepPayload> {
    return this.defaultRouteStepService.delete(id, context);
  }

  @Mutation("restoreDefaultRouteStep")
  async restoreDefaultRouteStep(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<DefaultRouteStepPayload> {
    return this.defaultRouteStepService.restore(id, context);
  }
}
