import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { DefaultRouteMachiningService } from "../default-route-machining.service.js";
import type {
  CreateDefaultRouteMachiningInput,
  UpdateDefaultRouteMachiningInput,
  DefaultRouteMachiningPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("DefaultRouteMachining")
export class DefaultRouteMachiningMutationResolver {
  constructor(private readonly defaultRouteMachiningService: DefaultRouteMachiningService) {}

  @Mutation("createDefaultRouteMachining")
  async createDefaultRouteMachining(
    @Args("input") input: CreateDefaultRouteMachiningInput,
    @Context() context: any,
  ): Promise<DefaultRouteMachiningPayload> {
    return this.defaultRouteMachiningService.create(input, context);
  }

  @Mutation("updateDefaultRouteMachining")
  async updateDefaultRouteMachining(
    @Args("id") id: string,
    @Args("input") input: UpdateDefaultRouteMachiningInput,
    @Context() context: any,
  ): Promise<DefaultRouteMachiningPayload> {
    return this.defaultRouteMachiningService.update(id, input, context);
  }

  @Mutation("deleteDefaultRouteMachining")
  async deleteDefaultRouteMachining(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<DefaultRouteMachiningPayload> {
    return this.defaultRouteMachiningService.delete(id, context);
  }

  @Mutation("restoreDefaultRouteMachining")
  async restoreDefaultRouteMachining(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<DefaultRouteMachiningPayload> {
    return this.defaultRouteMachiningService.restore(id, context);
  }
}
