import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { MaterialGroupService } from "../material-group.service.js";
import type {
  CreateMaterialGroupInput,
  UpdateMaterialGroupInput,
  MaterialGroupPayload,
} from "../../../generated/graphql/types.js";

@Resolver("MaterialGroup")
export class MaterialGroupMutationResolver {
  constructor(private readonly materialGroupService: MaterialGroupService) {}

  @Mutation("createMaterialGroup")
  async createMaterialGroup(
    @Args("input") input: CreateMaterialGroupInput,
    @Context() context: any,
  ): Promise<MaterialGroupPayload> {
    return this.materialGroupService.create(input, context);
  }

  @Mutation("updateMaterialGroup")
  async updateMaterialGroup(
    @Args("id") id: string,
    @Args("input") input: UpdateMaterialGroupInput,
    @Context() context: any,
  ): Promise<MaterialGroupPayload> {
    return this.materialGroupService.update(id, input, context);
  }

  @Mutation("deleteMaterialGroup")
  async deleteMaterialGroup(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MaterialGroupPayload> {
    return this.materialGroupService.delete(id, context);
  }

  @Mutation("restoreMaterialGroup")
  async restoreMaterialGroup(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MaterialGroupPayload> {
    return this.materialGroupService.restore(id, context);
  }
}
