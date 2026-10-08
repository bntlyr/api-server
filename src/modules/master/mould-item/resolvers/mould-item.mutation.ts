import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { MouldItemService } from "../mould-item.service.js";
import type {
  CreateMouldItemInput,
  UpdateMouldItemInput,
  MouldItemPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("MouldItem")
export class MouldItemMutationResolver {
  constructor(private readonly mouldItemService: MouldItemService) {}

  @Mutation("createMouldItem")
  async createMouldItem(
    @Args("input") input: CreateMouldItemInput,
    @Context() context: any,
  ): Promise<MouldItemPayload> {
    return this.mouldItemService.create(input, context);
  }

  @Mutation("updateMouldItem")
  async updateMouldItem(
    @Args("id") id: string,
    @Args("input") input: UpdateMouldItemInput,
    @Context() context: any,
  ): Promise<MouldItemPayload> {
    return this.mouldItemService.update(id, input, context);
  }

  @Mutation("deleteMouldItem")
  async deleteMouldItem(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MouldItemPayload> {
    return this.mouldItemService.delete(id, context);
  }

  @Mutation("restoreMouldItem")
  async restoreMouldItem(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MouldItemPayload> {
    return this.mouldItemService.restore(id, context);
  }
}
