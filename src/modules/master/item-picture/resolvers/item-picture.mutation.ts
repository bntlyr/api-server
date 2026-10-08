import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ItemPictureService } from "../item-picture.service.js";
import type {
  CreateItemPictureInput,
  UpdateItemPictureInput,
  ItemPicturePayload,
} from "../../../../generated//graphql/types.js";

@Resolver("ItemPicture")
export class ItemPictureMutationResolver {
  constructor(private readonly itemPictureService: ItemPictureService) {}

  @Mutation("createItemPicture")
  async createItemPicture(
    @Args("input") input: CreateItemPictureInput,
    @Context() context: any,
  ): Promise<ItemPicturePayload> {
    return this.itemPictureService.create(input, context);
  }

  @Mutation("updateItemPicture")
  async updateItemPicture(
    @Args("id") id: string,
    @Args("input") input: UpdateItemPictureInput,
    @Context() context: any,
  ): Promise<ItemPicturePayload> {
    return this.itemPictureService.update(id, input, context);
  }

  @Mutation("deleteItemPicture")
  async deleteItemPicture(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ItemPicturePayload> {
    return this.itemPictureService.delete(id, context);
  }

  @Mutation("restoreItemPicture")
  async restoreItemPicture(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ItemPicturePayload> {
    return this.itemPictureService.restore(id, context);
  }
}
