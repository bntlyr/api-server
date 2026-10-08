import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { SupplierService } from "../supplier.service.js";
import type {
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("Supplier")
export class SupplierMutationResolver {
  constructor(private readonly supplierService: SupplierService) {}

  @Mutation("createSupplier")
  async createSupplier(
    @Args("input") input: CreateSupplierInput,
    @Context() context: any,
  ): Promise<SupplierPayload> {
    return this.supplierService.create(input, context);
  }

  @Mutation("updateSupplier")
  async updateSupplier(
    @Args("id") id: string,
    @Args("input") input: UpdateSupplierInput,
    @Context() context: any,
  ): Promise<SupplierPayload> {
    return this.supplierService.update(id, input, context);
  }

  @Mutation("deleteSupplier")
  async deleteSupplier(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<SupplierPayload> {
    return this.supplierService.delete(id, context);
  }

  @Mutation("restoreSupplier")
  async restoreSupplier(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<SupplierPayload> {
    return this.supplierService.restore(id, context);
  }
}
