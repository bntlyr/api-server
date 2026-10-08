import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { MouldService } from "../mould.service.js";
import type {
  CreateMouldInput,
  UpdateMouldInput,
  MouldPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("Mould")
export class MouldMutationResolver {
  constructor(private readonly mouldService: MouldService) {}

  @Mutation("createMould")
  async createMould(
    @Args("input") input: CreateMouldInput,
    @Context() context: any,
  ): Promise<MouldPayload> {
    return this.mouldService.create(input, context);
  }

  @Mutation("updateMould")
  async updateMould(
    @Args("id") id: string,
    @Args("input") input: UpdateMouldInput,
    @Context() context: any,
  ): Promise<MouldPayload> {
    return this.mouldService.update(id, input, context);
  }

  @Mutation("deleteMould")
  async deleteMould(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MouldPayload> {
    return this.mouldService.delete(id, context);
  }

  @Mutation("restoreMould")
  async restoreMould(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MouldPayload> {
    return this.mouldService.restore(id, context);
  }
}
