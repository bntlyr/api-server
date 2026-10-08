import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { AreaService } from "../area.service.js";
import type {
  CreateAreaInput,
  UpdateAreaInput,
  AreaPayload,
} from "../../../generated/graphql/types.js";

@Resolver("Area")
export class AreaMutationResolver {
  constructor(private readonly areaService: AreaService) {}

  @Mutation("createArea")
  async createArea(
    @Args("input") input: CreateAreaInput,
    @Context() context: any,
  ): Promise<AreaPayload> {
    return this.areaService.create(input, context);
  }

  @Mutation("updateArea")
  async updateArea(
    @Args("id") id: string,
    @Args("input") input: UpdateAreaInput,
    @Context() context: any,
  ): Promise<AreaPayload> {
    return this.areaService.update(id, input, context);
  }

  @Mutation("deleteArea")
  async deleteArea(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<AreaPayload> {
    return this.areaService.delete(id, context);
  }

  @Mutation("restoreArea")
  async restoreArea(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<AreaPayload> {
    return this.areaService.restore(id, context);
  }
}
