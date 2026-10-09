import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { PalletContainerService } from "../pallet-container.service.js";
import type {
  CreatePalletContainerInput,
  MoveBoxContainerInput,
  PalletContainerPayload,
  RemoveBoxFromPalletInput,
  UpdatePalletContainerInput,
} from "../../../generated/graphql/types.js";

@Resolver("PalletContainer")
export class PalletContainerMutationResolver {
  constructor(private readonly palletContainerService: PalletContainerService) {}

  @Mutation("createPalletContainer")
  async createPalletContainer(
    @Args("input") input: CreatePalletContainerInput,
    @Context() context: any,
  ): Promise<PalletContainerPayload> {
    return this.palletContainerService.create(input, context);
  }

  @Mutation("updatePalletContainer")
  async updatePalletContainer(
    @Args("id") id: string,
    @Args("input") input: UpdatePalletContainerInput,
    @Context() context: any,
  ): Promise<PalletContainerPayload> {
    return this.palletContainerService.update(id, input, context);
  }

  @Mutation("deletePalletContainer")
  async deletePalletContainer(
    @Args("id") id: string,
    @Args("targetAreaId", { nullable: true }) targetAreaId?: number | null,
    @Args("targetLocationId", { nullable: true }) targetLocationId?: number | null,
    @Context() context?: any,
  ): Promise<PalletContainerPayload> {
    return this.palletContainerService.delete(id, targetAreaId, targetLocationId, context);
  }

  @Mutation("togglePalletSeal")
  async togglePalletSeal(
    @Args("palletContainerId") palletContainerId: string,
    @Args("seal") seal: boolean,
    @Context() context: any,
  ): Promise<PalletContainerPayload> {
    return this.palletContainerService.toggleSeal(palletContainerId, seal, context);
  }

  @Mutation("moveBoxContainer")
  async moveBoxContainer(
    @Args("input") input: MoveBoxContainerInput,
    @Context() context: any,
  ): Promise<PalletContainerPayload> {
    return this.palletContainerService.moveBox(input, context);
  }

  @Mutation("removeBoxFromPallet")
  async removeBoxFromPallet(
    @Args("input") input: RemoveBoxFromPalletInput,
    @Context() context: any,
  ): Promise<PalletContainerPayload> {
    return this.palletContainerService.removeBox(input, context);
  }
}
