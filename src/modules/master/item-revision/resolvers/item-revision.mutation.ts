import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ItemRevisionService } from "../item-revision.service.js";
import type {
  CreateItemRevisionInput,
  UpdateItemRevisionInput,
  ItemRevisionPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("ItemRevision")
export class ItemRevisionMutationResolver {
  constructor(private readonly itemRevisionService: ItemRevisionService) {}

  @Mutation("createItemRevision")
  async createItemRevision(
    @Args("input") input: CreateItemRevisionInput,
    @Context() context: any,
  ): Promise<ItemRevisionPayload> {
    return this.itemRevisionService.create(input, context);
  }

  @Mutation("updateItemRevision")
  async updateItemRevision(
    @Args("id") id: string,
    @Args("input") input: UpdateItemRevisionInput,
    @Context() context: any,
  ): Promise<ItemRevisionPayload> {
    return this.itemRevisionService.update(id, input, context);
  }

  @Mutation("deleteItemRevision")
  async deleteItemRevision(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ItemRevisionPayload> {
    return this.itemRevisionService.delete(id, context);
  }

  @Mutation("restoreItemRevision")
  async restoreItemRevision(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ItemRevisionPayload> {
    return this.itemRevisionService.restore(id, context);
  }
}
