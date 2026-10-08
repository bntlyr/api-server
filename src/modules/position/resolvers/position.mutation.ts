import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { PositionService } from "../position.service.js";
import type {
  CreatePositionInput,
  UpdatePositionInput,
  PositionPayload,
} from "../../../generated/graphql/types.js";

@Resolver("Position")
export class PositionMutationResolver {
  constructor(private readonly positionService: PositionService) {}

  @Mutation("createPosition")
  async createPosition(
    @Args("input") input: CreatePositionInput,
    @Context() context: any,
  ): Promise<PositionPayload> {
    return this.positionService.create(input, context);
  }

  @Mutation("updatePosition")
  async updatePosition(
    @Args("id") id: string,
    @Args("input") input: UpdatePositionInput,
    @Context() context: any,
  ): Promise<PositionPayload> {
    return this.positionService.update(id, input, context);
  }

  @Mutation("deletePosition")
  async deletePosition(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<PositionPayload> {
    return this.positionService.delete(id, context);
  }

  @Mutation("restorePosition")
  async restorePosition(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<PositionPayload> {
    return this.positionService.restore(id, context);
  }
}
