import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { MaterialSupplierService } from "../material-supplier.service.js";
import type {
  CreateMaterialSupplierInput,
  UpdateMaterialSupplierInput,
  MaterialSupplierPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("MaterialSupplier")
export class MaterialSupplierMutationResolver {
  constructor(private readonly materialSupplierService: MaterialSupplierService) {}

  @Mutation("createMaterialSupplier")
  async createMaterialSupplier(
    @Args("input") input: CreateMaterialSupplierInput,
    @Context() context: any,
  ): Promise<MaterialSupplierPayload> {
    return this.materialSupplierService.create(input, context);
  }

  @Mutation("updateMaterialSupplier")
  async updateMaterialSupplier(
    @Args("id") id: string,
    @Args("input") input: UpdateMaterialSupplierInput,
    @Context() context: any,
  ): Promise<MaterialSupplierPayload> {
    return this.materialSupplierService.update(id, input, context);
  }

  @Mutation("deleteMaterialSupplier")
  async deleteMaterialSupplier(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MaterialSupplierPayload> {
    return this.materialSupplierService.delete(id, context);
  }

  @Mutation("restoreMaterialSupplier")
  async restoreMaterialSupplier(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<MaterialSupplierPayload> {
    return this.materialSupplierService.restore(id, context);
  }
}
