import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ItemRouteService } from "../item-route.service.js";
import type {
  CreateItemRouteInput,
  UpdateItemRouteInput,
  ItemRoutePayload,
} from "../../../generated/graphql/types.js";

@Resolver("ItemRoute")
export class ItemRouteMutationResolver {
  constructor(private readonly itemRouteService: ItemRouteService) {}

  @Mutation("createItemRoute")
  async createItemRoute(
    @Args("input") input: CreateItemRouteInput,
    @Context() context: any,
  ): Promise<ItemRoutePayload> {
    return this.itemRouteService.create(input, context);
  }

  @Mutation("updateItemRoute")
  async updateItemRoute(
    @Args("id") id: string,
    @Args("input") input: UpdateItemRouteInput,
    @Context() context: any,
  ): Promise<ItemRoutePayload> {
    return this.itemRouteService.update(id, input, context);
  }

  @Mutation("deleteItemRoute")
  async deleteItemRoute(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ItemRoutePayload> {
    return this.itemRouteService.delete(id, context);
  }

  @Mutation("restoreItemRoute")
  async restoreItemRoute(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ItemRoutePayload> {
    return this.itemRouteService.restore(id, context);
  }
}
