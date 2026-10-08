import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { MouldTypeService } from "../mould-type.service.js";
import type {
  CreateMouldTypeInput,
  UpdateMouldTypeInput,
  MouldTypePayload,
} from "../../../../generated//graphql/types.js";

@Resolver("MouldType")
export class MouldTypeMutationResolver {
  constructor(private readonly mouldTypeService: MouldTypeService) {}

  @Mutation("createMouldType")
  async createMouldType(
    @Args("input") input: CreateMouldTypeInput,
    @Context() context: any,
  ): Promise<MouldTypePayload> {
    return this.mouldTypeService.create(input, context);
  }

  @Mutation("updateMouldType")
  async updateMouldType(
    @Args("id") id: string,
    @Args("input") input: UpdateMouldTypeInput,
    @Context() context: any,
  ): Promise<MouldTypePayload> {
    return this.mouldTypeService.update(id, input, context);
  }

  @Mutation("deleteMouldType")
  async deleteMouldType(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MouldTypePayload> {
    return this.mouldTypeService.delete(id, context);
  }

  @Mutation("restoreMouldType")
  async restoreMouldType(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MouldTypePayload> {
    return this.mouldTypeService.restore(id, context);
  }
}
