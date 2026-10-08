import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { PalletTypeService } from "../pallet-type.service.js";
import type {
  CreatePalletTypeInput,
  UpdatePalletTypeInput,
  PalletTypePayload,
} from "../../../../generated//graphql/types.js";

@Resolver("PalletType")
export class PalletTypeMutationResolver {
  constructor(private readonly palletTypeService: PalletTypeService) {}

  @Mutation("createPalletType")
  async createPalletType(
    @Args("input") input: CreatePalletTypeInput,
    @Context() context: any,
  ): Promise<PalletTypePayload> {
    return this.palletTypeService.create(input, context);
  }

  @Mutation("updatePalletType")
  async updatePalletType(
    @Args("id") id: string,
    @Args("input") input: UpdatePalletTypeInput,
    @Context() context: any,
  ): Promise<PalletTypePayload> {
    return this.palletTypeService.update(id, input, context);
  }

  @Mutation("deletePalletType")
  async deletePalletType(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<PalletTypePayload> {
    return this.palletTypeService.delete(id, context);
  }

  @Mutation("restorePalletType")
  async restorePalletType(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<PalletTypePayload> {
    return this.palletTypeService.restore(id, context);
  }
}
