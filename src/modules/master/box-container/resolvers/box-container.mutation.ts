import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { BoxContainerService } from "../box-container.service.js";
import type {
  CreateBoxContainerInput,
  UpdateBoxContainerInput,
  BoxContainerPayload,
} from "../../../../generated/graphql/types.js";

@Resolver("BoxContainer")
export class BoxContainerMutationResolver {
  constructor(private readonly boxContainerService: BoxContainerService) {}

  @Mutation("createBoxContainer")
  async createBoxContainer(
    @Args("input") input: CreateBoxContainerInput,
    @Context() context: any,
  ): Promise<BoxContainerPayload> {
    return this.boxContainerService.create(input, context);
  }

  @Mutation("updateBoxContainer")
  async updateBoxContainer(
    @Args("id") id: string,
    @Args("input") input: UpdateBoxContainerInput,
    @Context() context: any,
  ): Promise<BoxContainerPayload> {
    return this.boxContainerService.update(id, input, context);
  }

  @Mutation("deleteBoxContainer")
  async deleteBoxContainer(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<BoxContainerPayload> {
    return this.boxContainerService.delete(id, context);
  }

  @Mutation("restoreBoxContainer")
  async restoreBoxContainer(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<BoxContainerPayload> {
    return this.boxContainerService.restore(id, context);
  }

  @Mutation("addItemsToBoxContainer")
  async addItemsToBoxContainer(
    @Args("input") input: any,
    @Context() context: any,
  ): Promise<BoxContainerPayload> {
    return this.boxContainerService.addItems(input, context);
  }

  @Mutation("removeItemFromBoxContainer")
  async removeItemFromBoxContainer(
    @Args("input") input: any,
    @Context() context: any,
  ): Promise<BoxContainerPayload> {
    return this.boxContainerService.removeItem(input, context);
  }

  @Mutation("closeBoxContainer")
  async closeBoxContainer(
    @Args("input") input: any,
    @Context() context: any,
  ): Promise<BoxContainerPayload> {
    return this.boxContainerService.closeBoxContainer(input, context);
  }
}
