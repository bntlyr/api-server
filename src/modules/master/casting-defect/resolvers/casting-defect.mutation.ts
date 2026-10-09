import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { CastingDefectService } from "../casting-defect.service.js";
import type {
  CreateCastingDefectInput,
  UpdateCastingDefectInput,
  CastingDefectPayload,
} from "../../../../generated/graphql/types.js";

@Resolver("CastingDefect")
export class CastingDefectMutationResolver {
  constructor(private readonly castingDefectService: CastingDefectService) {}

  @Mutation("createCastingDefect")
  async createCastingDefect(
    @Args("input") input: CreateCastingDefectInput,
    @Context() context: any,
  ): Promise<CastingDefectPayload> {
    return this.castingDefectService.create(input, context);
  }

  @Mutation("updateCastingDefect")
  async updateCastingDefect(
    @Args("id") id: string,
    @Args("input") input: UpdateCastingDefectInput,
    @Context() context: any,
  ): Promise<CastingDefectPayload> {
    return this.castingDefectService.update(id, input, context);
  }

  @Mutation("deleteCastingDefect")
  async deleteCastingDefect(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<CastingDefectPayload> {
    return this.castingDefectService.delete(id, context);
  }

  @Mutation("restoreCastingDefect")
  async restoreCastingDefect(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<CastingDefectPayload> {
    return this.castingDefectService.restore(id, context);
  }
}
