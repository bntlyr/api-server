import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { MimDefectService } from "../mim-defect.service.js";
import type {
  CreateMimDefectInput,
  UpdateMimDefectInput,
  MimDefectPayload,
} from "../../../../generated/graphql/types.js";

@Resolver("MimDefect")
export class MimDefectMutationResolver {
  constructor(private readonly mimDefectService: MimDefectService) {}

  @Mutation("createMimDefect")
  async createMimDefect(
    @Args("input") input: CreateMimDefectInput,
    @Context() context: any,
  ): Promise<MimDefectPayload> {
    return this.mimDefectService.create(input, context);
  }

  @Mutation("updateMimDefect")
  async updateMimDefect(
    @Args("id") id: string,
    @Args("input") input: UpdateMimDefectInput,
    @Context() context: any,
  ): Promise<MimDefectPayload> {
    return this.mimDefectService.update(id, input, context);
  }

  @Mutation("deleteMimDefect")
  async deleteMimDefect(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MimDefectPayload> {
    return this.mimDefectService.delete(id, context);
  }

  @Mutation("restoreMimDefect")
  async restoreMimDefect(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MimDefectPayload> {
    return this.mimDefectService.restore(id, context);
  }
}
