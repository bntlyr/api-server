import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { RawMaterialRotationService } from "../raw-material-rotation.service.js";
import type {
  CreateRawMaterialRotationInput,
  UpdateRawMaterialRotationInput,
  RawMaterialRotationPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("RawMaterialRotation")
export class RawMaterialRotationMutationResolver {
  constructor(private readonly rawMaterialRotationService: RawMaterialRotationService) {}

  @Mutation("createRawMaterialRotation")
  async createRawMaterialRotation(
    @Args("input") input: CreateRawMaterialRotationInput,
    @Context() context: any,
  ): Promise<RawMaterialRotationPayload> {
    return this.rawMaterialRotationService.create(input, context);
  }

  @Mutation("updateRawMaterialRotation")
  async updateRawMaterialRotation(
    @Args("id") id: string,
    @Args("input") input: UpdateRawMaterialRotationInput,
    @Context() context: any,
  ): Promise<RawMaterialRotationPayload> {
    return this.rawMaterialRotationService.update(id, input, context);
  }

  @Mutation("deleteRawMaterialRotation")
  async deleteRawMaterialRotation(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<RawMaterialRotationPayload> {
    return this.rawMaterialRotationService.delete(id, context);
  }

  @Mutation("restoreRawMaterialRotation")
  async restoreRawMaterialRotation(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<RawMaterialRotationPayload> {
    return this.rawMaterialRotationService.restore(id, context);
  }
}
