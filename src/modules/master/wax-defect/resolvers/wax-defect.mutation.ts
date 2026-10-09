import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { WaxDefectService } from "../wax-defect.service.js";
import type {
  CreateWaxDefectInput,
  UpdateWaxDefectInput,
  WaxDefectPayload,
} from "../../../../generated/graphql/types.js";

@Resolver("WaxDefect")
export class WaxDefectMutationResolver {
  constructor(private readonly waxDefectService: WaxDefectService) {}

  @Mutation("createWaxDefect")
  async createWaxDefect(
    @Args("input") input: CreateWaxDefectInput,
    @Context() context: any,
  ): Promise<WaxDefectPayload> {
    return this.waxDefectService.create(input, context);
  }

  @Mutation("updateWaxDefect")
  async updateWaxDefect(
    @Args("id") id: string,
    @Args("input") input: UpdateWaxDefectInput,
    @Context() context: any,
  ): Promise<WaxDefectPayload> {
    return this.waxDefectService.update(id, input, context);
  }

  @Mutation("deleteWaxDefect")
  async deleteWaxDefect(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<WaxDefectPayload> {
    return this.waxDefectService.delete(id, context);
  }

  @Mutation("restoreWaxDefect")
  async restoreWaxDefect(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<WaxDefectPayload> {
    return this.waxDefectService.restore(id, context);
  }
}
