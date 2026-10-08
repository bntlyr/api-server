import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { DefaultRouteIterationService } from "../default-route-iteration.service.js";
import type {
  CreateDefaultRouteIterationInput,
  UpdateDefaultRouteIterationInput,
  DefaultRouteIterationPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("DefaultRouteIteration")
export class DefaultRouteIterationMutationResolver {
  constructor(private readonly defaultRouteIterationService: DefaultRouteIterationService) {}

  @Mutation("createDefaultRouteIteration")
  async createDefaultRouteIteration(
    @Args("input") input: CreateDefaultRouteIterationInput,
    @Context() context: any,
  ): Promise<DefaultRouteIterationPayload> {
    return this.defaultRouteIterationService.create(input, context);
  }

  @Mutation("updateDefaultRouteIteration")
  async updateDefaultRouteIteration(
    @Args("id") id: string,
    @Args("input") input: UpdateDefaultRouteIterationInput,
    @Context() context: any,
  ): Promise<DefaultRouteIterationPayload> {
    return this.defaultRouteIterationService.update(id, input, context);
  }

  @Mutation("deleteDefaultRouteIteration")
  async deleteDefaultRouteIteration(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<DefaultRouteIterationPayload> {
    return this.defaultRouteIterationService.delete(id, context);
  }

  @Mutation("restoreDefaultRouteIteration")
  async restoreDefaultRouteIteration(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<DefaultRouteIterationPayload> {
    return this.defaultRouteIterationService.restore(id, context);
  }
}
