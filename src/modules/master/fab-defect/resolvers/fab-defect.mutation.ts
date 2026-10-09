import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { FabDefectService } from "../fab-defect.service.js";
import type {
  CreateFabDefectInput,
  UpdateFabDefectInput,
  FabDefectPayload,
} from "../../../../generated/graphql/types.js";

@Resolver("FabDefect")
export class FabDefectMutationResolver {
  constructor(private readonly fabDefectService: FabDefectService) {}

  @Mutation("createFabDefect")
  async createFabDefect(
    @Args("input") input: CreateFabDefectInput,
    @Context() context: any,
  ): Promise<FabDefectPayload> {
    return this.fabDefectService.create(input, context);
  }

  @Mutation("updateFabDefect")
  async updateFabDefect(
    @Args("id") id: string,
    @Args("input") input: UpdateFabDefectInput,
    @Context() context: any,
  ): Promise<FabDefectPayload> {
    return this.fabDefectService.update(id, input, context);
  }

  @Mutation("deleteFabDefect")
  async deleteFabDefect(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<FabDefectPayload> {
    return this.fabDefectService.delete(id, context);
  }

  @Mutation("restoreFabDefect")
  async restoreFabDefect(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<FabDefectPayload> {
    return this.fabDefectService.restore(id, context);
  }
}
