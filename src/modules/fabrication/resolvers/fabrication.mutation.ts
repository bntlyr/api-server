import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { FabricationService } from "../fabrication.service.js";
import type {
  CreateFabricationInput,
  UpdateFabricationInput,
  FabricationPayload,
} from "../../../generated/graphql/types.js";

@Resolver("Fabrication")
export class FabricationMutationResolver {
  constructor(private readonly fabricationService: FabricationService) {}

  @Mutation("createFabrication")
  async createFabrication(
    @Args("input") input: CreateFabricationInput,
    @Context() context: any,
  ): Promise<FabricationPayload> {
    return this.fabricationService.create(input, context);
  }

  @Mutation("updateFabrication")
  async updateFabrication(
    @Args("id") id: string,
    @Args("input") input: UpdateFabricationInput,
    @Context() context: any,
  ): Promise<FabricationPayload> {
    return this.fabricationService.update(id, input, context);
  }

  @Mutation("deleteFabrication")
  async deleteFabrication(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<FabricationPayload> {
    return this.fabricationService.delete(id, context);
  }

  @Mutation("restoreFabrication")
  async restoreFabrication(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<FabricationPayload> {
    return this.fabricationService.restore(id, context);
  }
}
