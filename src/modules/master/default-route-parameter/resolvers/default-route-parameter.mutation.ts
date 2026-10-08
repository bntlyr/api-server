import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { DefaultRouteParameterService } from "../default-route-parameter.service.js";
import type {
  CreateDefaultRouteParameterInput,
  UpdateDefaultRouteParameterInput,
  DefaultRouteParameterPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("DefaultRouteParameter")
export class DefaultRouteParameterMutationResolver {
  constructor(private readonly defaultRouteParameterService: DefaultRouteParameterService) {}

  @Mutation("createDefaultRouteParameter")
  async createDefaultRouteParameter(
    @Args("input") input: CreateDefaultRouteParameterInput,
    @Context() context: any,
  ): Promise<DefaultRouteParameterPayload> {
    return this.defaultRouteParameterService.create(input, context);
  }

  @Mutation("updateDefaultRouteParameter")
  async updateDefaultRouteParameter(
    @Args("id") id: string,
    @Args("input") input: UpdateDefaultRouteParameterInput,
    @Context() context: any,
  ): Promise<DefaultRouteParameterPayload> {
    return this.defaultRouteParameterService.update(id, input, context);
  }

  @Mutation("deleteDefaultRouteParameter")
  async deleteDefaultRouteParameter(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<DefaultRouteParameterPayload> {
    return this.defaultRouteParameterService.delete(id, context);
  }

  @Mutation("restoreDefaultRouteParameter")
  async restoreDefaultRouteParameter(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<DefaultRouteParameterPayload> {
    return this.defaultRouteParameterService.restore(id, context);
  }
}
