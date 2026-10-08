import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ItemService } from "../item.service.js";
import type {
  CreateItemInput,
  UpdateItemInput,
  ItemPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("Item")
export class ItemMutationResolver {
  constructor(private readonly itemService: ItemService) {}

  @Mutation("createItem")
  async createItem(
    @Args("input") input: CreateItemInput,
    @Context() context: any,
  ): Promise<ItemPayload> {
    return this.itemService.create(input, context);
  }

  @Mutation("updateItem")
  async updateItem(
    @Args("id") id: string,
    @Args("input") input: UpdateItemInput,
    @Context() context: any,
  ): Promise<ItemPayload> {
    return this.itemService.update(id, input, context);
  }

  @Mutation("deleteItem")
  async deleteItem(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ItemPayload> {
    return this.itemService.delete(id, context);
  }

  @Mutation("restoreItem")
  async restoreItem(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ItemPayload> {
    return this.itemService.restore(id, context);
  }
}
