import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { RawMaterialService } from "../raw-material.service.js";
import type {
  CreateRawMaterialInput,
  UpdateRawMaterialInput,
  RawMaterialPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("RawMaterial")
export class RawMaterialMutationResolver {
  constructor(private readonly rawMaterialService: RawMaterialService) {}

  @Mutation("createRawMaterial")
  async createRawMaterial(
    @Args("input") input: CreateRawMaterialInput,
    @Context() context: any,
  ): Promise<RawMaterialPayload> {
    return this.rawMaterialService.create(input, context);
  }

  @Mutation("updateRawMaterial")
  async updateRawMaterial(
    @Args("id") id: string,
    @Args("input") input: UpdateRawMaterialInput,
    @Context() context: any,
  ): Promise<RawMaterialPayload> {
    return this.rawMaterialService.update(id, input, context);
  }

  @Mutation("deleteRawMaterial")
  async deleteRawMaterial(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<RawMaterialPayload> {
    return this.rawMaterialService.delete(id, context);
  }

  @Mutation("restoreRawMaterial")
  async restoreRawMaterial(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<RawMaterialPayload> {
    return this.rawMaterialService.restore(id, context);
  }
}
