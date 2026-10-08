import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ItemRouteStepService } from "../item-route-step.service.js";
import type {
  CreateItemRouteStepInput,
  UpdateItemRouteStepInput,
  ItemRouteStepPayload,
} from "../../../generated/graphql/types.js";

@Resolver("ItemRouteStep")
export class ItemRouteStepMutationResolver {
  constructor(private readonly itemRouteStepService: ItemRouteStepService) {}

  @Mutation("createItemRouteStep")
  async createItemRouteStep(
    @Args("input") input: CreateItemRouteStepInput,
    @Context() context: any,
  ): Promise<ItemRouteStepPayload> {
    return this.itemRouteStepService.create(input, context);
  }

  @Mutation("updateItemRouteStep")
  async updateItemRouteStep(
    @Args("id") id: string,
    @Args("input") input: UpdateItemRouteStepInput,
    @Context() context: any,
  ): Promise<ItemRouteStepPayload> {
    return this.itemRouteStepService.update(id, input, context);
  }

  @Mutation("deleteItemRouteStep")
  async deleteItemRouteStep(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ItemRouteStepPayload> {
    return this.itemRouteStepService.delete(id, context);
  }

  @Mutation("restoreItemRouteStep")
  async restoreItemRouteStep(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ItemRouteStepPayload> {
    return this.itemRouteStepService.restore(id, context);
  }
}
