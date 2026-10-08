import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { BoxTypeService } from "../box-type.service.js";
import type {
  CreateBoxTypeInput,
  UpdateBoxTypeInput,
  BoxTypePayload,
} from "../../../../generated//graphql/types.js";

@Resolver("BoxType")
export class BoxTypeMutationResolver {
  constructor(private readonly boxTypeService: BoxTypeService) {}

  @Mutation("createBoxType")
  async createBoxType(
    @Args("input") input: CreateBoxTypeInput,
    @Context() context: any,
  ): Promise<BoxTypePayload> {
    return this.boxTypeService.create(input, context);
  }

  @Mutation("updateBoxType")
  async updateBoxType(
    @Args("id") id: string,
    @Args("input") input: UpdateBoxTypeInput,
    @Context() context: any,
  ): Promise<BoxTypePayload> {
    return this.boxTypeService.update(id, input, context);
  }

  @Mutation("deleteBoxType")
  async deleteBoxType(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<BoxTypePayload> {
    return this.boxTypeService.delete(id, context);
  }

  @Mutation("restoreBoxType")
  async restoreBoxType(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<BoxTypePayload> {
    return this.boxTypeService.restore(id, context);
  }
}
