import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { MaterialService } from "../material.service.js";
import type {
  CreateMaterialInput,
  UpdateMaterialInput,
  MaterialPayload,
} from "../../../generated/graphql/types.js";

@Resolver("Material")
export class MaterialMutationResolver {
  constructor(private readonly materialService: MaterialService) {}

  @Mutation("createMaterial")
  async createMaterial(
    @Args("input") input: CreateMaterialInput,
    @Context() context: any,
  ): Promise<MaterialPayload> {
    return this.materialService.create(input, context);
  }

  @Mutation("updateMaterial")
  async updateMaterial(
    @Args("id") id: string,
    @Args("input") input: UpdateMaterialInput,
    @Context() context: any,
  ): Promise<MaterialPayload> {
    return this.materialService.update(id, input, context);
  }

  @Mutation("deleteMaterial")
  async deleteMaterial(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MaterialPayload> {
    return this.materialService.delete(id, context);
  }

  @Mutation("restoreMaterial")
  async restoreMaterial(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MaterialPayload> {
    return this.materialService.restore(id, context);
  }
}
