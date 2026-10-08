import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { MeltingService } from "../melting.service.js";
import type {
  CreateMeltingInput,
  UpdateMeltingInput,
  MeltingPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("Melting")
export class MeltingMutationResolver {
  constructor(private readonly meltingService: MeltingService) {}

  @Mutation("createMelting")
  async createMelting(
    @Args("input") input: CreateMeltingInput,
    @Context() context: any,
  ): Promise<MeltingPayload> {
    return this.meltingService.create(input, context);
  }

  @Mutation("updateMelting")
  async updateMelting(
    @Args("id") id: string,
    @Args("input") input: UpdateMeltingInput,
    @Context() context: any,
  ): Promise<MeltingPayload> {
    return this.meltingService.update(id, input, context);
  }

  @Mutation("deleteMelting")
  async deleteMelting(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MeltingPayload> {
    return this.meltingService.delete(id, context);
  }

  @Mutation("restoreMelting")
  async restoreMelting(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MeltingPayload> {
    return this.meltingService.restore(id, context);
  }
}
