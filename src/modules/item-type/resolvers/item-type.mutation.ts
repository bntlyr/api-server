import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ItemTypeService } from "../item-type.service.js";
import type {
  CreateItemTypeInput,
  UpdateItemTypeInput,
  ItemTypePayload,
} from "../../../generated/graphql/types.js";

@Resolver("ItemType")
export class ItemTypeMutationResolver {
  constructor(private readonly itemTypeService: ItemTypeService) {}

  @Mutation("createItemType")
  async createItemType(
    @Args("input") input: CreateItemTypeInput,
    @Context() context: any,
  ): Promise<ItemTypePayload> {
    return this.itemTypeService.create(input, context);
  }

  @Mutation("updateItemType")
  async updateItemType(
    @Args("id") id: string,
    @Args("input") input: UpdateItemTypeInput,
    @Context() context: any,
  ): Promise<ItemTypePayload> {
    return this.itemTypeService.update(id, input, context);
  }

  @Mutation("deleteItemType")
  async deleteItemType(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ItemTypePayload> {
    return this.itemTypeService.delete(id, context);
  }

  @Mutation("restoreItemType")
  async restoreItemType(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ItemTypePayload> {
    return this.itemTypeService.restore(id, context);
  }
}
