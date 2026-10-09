import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ProductionDtrService } from "../production-dtr.service.js";
import type {
  CreateProductionDtrInput,
  UpdateProductionDtrInput,
  ProductionDtrPayload,
} from "../../../../generated/graphql/types.js";

@Resolver("ProductionDtr")
export class ProductionDtrMutationResolver {
  constructor(private readonly productionDtrService: ProductionDtrService) {}

  @Mutation("createProductionDtr")
  async createProductionDtr(
    @Args("input") input: CreateProductionDtrInput,
    @Context() context: any,
  ): Promise<ProductionDtrPayload> {
    return this.productionDtrService.create(input, context);
  }

  @Mutation("updateProductionDtr")
  async updateProductionDtr(
    @Args("id") id: string,
    @Args("input") input: UpdateProductionDtrInput,
    @Context() context: any,
  ): Promise<ProductionDtrPayload> {
    return this.productionDtrService.update(id, input, context);
  }

  @Mutation("deleteProductionDtr")
  async deleteProductionDtr(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ProductionDtrPayload> {
    return this.productionDtrService.delete(id, context);
  }

  @Mutation("restoreProductionDtr")
  async restoreProductionDtr(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ProductionDtrPayload> {
    return this.productionDtrService.restore(id, context);
  }
}
