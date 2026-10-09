import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { BoxContainerItemService } from "../box-container-item.service.js";
import type {
  CreateBoxContainerItemInput,
  UpdateBoxContainerItemInput,
  BoxContainerItemPayload,
} from "../../../../generated/graphql/types.js";

@Resolver("BoxContainerItem")
export class BoxContainerItemMutationResolver {
  constructor(private readonly boxContainerItemService: BoxContainerItemService) {}

  @Mutation("createBoxContainerItem")
  async createBoxContainerItem(
    @Args("input") input: CreateBoxContainerItemInput,
    @Context() context: any,
  ): Promise<BoxContainerItemPayload> {
    return this.boxContainerItemService.create(input, context);
  }

  @Mutation("updateBoxContainerItem")
  async updateBoxContainerItem(
    @Args("id") id: string,
    @Args("input") input: UpdateBoxContainerItemInput,
    @Context() context: any,
  ): Promise<BoxContainerItemPayload> {
    return this.boxContainerItemService.update(id, input, context);
  }

  @Mutation("deleteBoxContainerItem")
  async deleteBoxContainerItem(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<BoxContainerItemPayload> {
    return this.boxContainerItemService.delete(id, context);
  }

  @Mutation("restoreBoxContainerItem")
  async restoreBoxContainerItem(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<BoxContainerItemPayload> {
    return this.boxContainerItemService.restore(id, context);
  }
}
