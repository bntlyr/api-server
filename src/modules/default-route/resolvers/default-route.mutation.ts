import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { DefaultRouteService } from "../default-route.service.js";
import type {
  CreateDefaultRouteInput,
  UpdateDefaultRouteInput,
  DefaultRoutePayload,
} from "../../../generated/graphql/types.js";

@Resolver("DefaultRoute")
export class DefaultRouteMutationResolver {
  constructor(private readonly defaultRouteService: DefaultRouteService) {}

  @Mutation("createDefaultRoute")
  async createDefaultRoute(
    @Args("input") input: CreateDefaultRouteInput,
    @Context() context: any,
  ): Promise<DefaultRoutePayload> {
    return this.defaultRouteService.create(input, context);
  }

  @Mutation("updateDefaultRoute")
  async updateDefaultRoute(
    @Args("id") id: string,
    @Args("input") input: UpdateDefaultRouteInput,
    @Context() context: any,
  ): Promise<DefaultRoutePayload> {
    return this.defaultRouteService.update(id, input, context);
  }

  @Mutation("deleteDefaultRoute")
  async deleteDefaultRoute(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<DefaultRoutePayload> {
    return this.defaultRouteService.delete(id, context);
  }

  @Mutation("restoreDefaultRoute")
  async restoreDefaultRoute(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<DefaultRoutePayload> {
    return this.defaultRouteService.restore(id, context);
  }
}
