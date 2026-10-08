import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ItemRouteIterationService } from "../item-route-iteration.service.js";
import type {
  CreateItemRouteIterationInput,
  UpdateItemRouteIterationInput,
  ItemRouteIterationPayload,
} from "../../../generated/graphql/types.js";

@Resolver("ItemRouteIteration")
export class ItemRouteIterationMutationResolver {
  constructor(private readonly itemRouteIterationService: ItemRouteIterationService) {}

  @Mutation("createItemRouteIteration")
  async createItemRouteIteration(
    @Args("input") input: CreateItemRouteIterationInput,
    @Context() context: any,
  ): Promise<ItemRouteIterationPayload> {
    return this.itemRouteIterationService.create(input, context);
  }

  @Mutation("updateItemRouteIteration")
  async updateItemRouteIteration(
    @Args("id") id: string,
    @Args("input") input: UpdateItemRouteIterationInput,
    @Context() context: any,
  ): Promise<ItemRouteIterationPayload> {
    return this.itemRouteIterationService.update(id, input, context);
  }

  @Mutation("deleteItemRouteIteration")
  async deleteItemRouteIteration(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ItemRouteIterationPayload> {
    return this.itemRouteIterationService.delete(id, context);
  }

  @Mutation("restoreItemRouteIteration")
  async restoreItemRouteIteration(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ItemRouteIterationPayload> {
    return this.itemRouteIterationService.restore(id, context);
  }
}
