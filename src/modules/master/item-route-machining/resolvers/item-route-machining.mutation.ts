import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ItemRouteMachiningService } from "../item-route-machining.service.js";
import type {
  CreateItemRouteMachiningInput,
  UpdateItemRouteMachiningInput,
  ItemRouteMachiningPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("ItemRouteMachining")
export class ItemRouteMachiningMutationResolver {
  constructor(private readonly itemRouteMachiningService: ItemRouteMachiningService) {}

  @Mutation("createItemRouteMachining")
  async createItemRouteMachining(
    @Args("input") input: CreateItemRouteMachiningInput,
    @Context() context: any,
  ): Promise<ItemRouteMachiningPayload> {
    return this.itemRouteMachiningService.create(input, context);
  }

  @Mutation("updateItemRouteMachining")
  async updateItemRouteMachining(
    @Args("id") id: string,
    @Args("input") input: UpdateItemRouteMachiningInput,
    @Context() context: any,
  ): Promise<ItemRouteMachiningPayload> {
    return this.itemRouteMachiningService.update(id, input, context);
  }

  @Mutation("deleteItemRouteMachining")
  async deleteItemRouteMachining(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ItemRouteMachiningPayload> {
    return this.itemRouteMachiningService.delete(id, context);
  }

  @Mutation("restoreItemRouteMachining")
  async restoreItemRouteMachining(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ItemRouteMachiningPayload> {
    return this.itemRouteMachiningService.restore(id, context);
  }
}
