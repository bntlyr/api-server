import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ItemRouteParameterService } from "../item-route-parameter.service.js";
import type {
  CreateItemRouteParameterInput,
  UpdateItemRouteParameterInput,
  ItemRouteParameterPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("ItemRouteParameter")
export class ItemRouteParameterMutationResolver {
  constructor(private readonly itemRouteParameterService: ItemRouteParameterService) {}

  @Mutation("createItemRouteParameter")
  async createItemRouteParameter(
    @Args("input") input: CreateItemRouteParameterInput,
    @Context() context: any,
  ): Promise<ItemRouteParameterPayload> {
    return this.itemRouteParameterService.create(input, context);
  }

  @Mutation("updateItemRouteParameter")
  async updateItemRouteParameter(
    @Args("id") id: string,
    @Args("input") input: UpdateItemRouteParameterInput,
    @Context() context: any,
  ): Promise<ItemRouteParameterPayload> {
    return this.itemRouteParameterService.update(id, input, context);
  }

  @Mutation("deleteItemRouteParameter")
  async deleteItemRouteParameter(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ItemRouteParameterPayload> {
    return this.itemRouteParameterService.delete(id, context);
  }

  @Mutation("restoreItemRouteParameter")
  async restoreItemRouteParameter(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ItemRouteParameterPayload> {
    return this.itemRouteParameterService.restore(id, context);
  }
}
