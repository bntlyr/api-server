import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ProductionSlipService } from "../production-slip.service.js";
import type {
  CreateProductionSlipInput,
  UpdateProductionSlipInput,
  ProductionSlipPayload,
} from "../../../../generated/graphql/types.js";

@Resolver("ProductionSlip")
export class ProductionSlipMutationResolver {
  constructor(private readonly productionSlipService: ProductionSlipService) {}

  @Mutation("createProductionSlip")
  async createProductionSlip(
    @Args("input") input: CreateProductionSlipInput,
    @Context() context: any,
  ): Promise<ProductionSlipPayload> {
    return this.productionSlipService.create(input, context);
  }

  @Mutation("updateProductionSlip")
  async updateProductionSlip(
    @Args("id") id: string,
    @Args("input") input: UpdateProductionSlipInput,
    @Context() context: any,
  ): Promise<ProductionSlipPayload> {
    return this.productionSlipService.update(id, input, context);
  }

  @Mutation("deleteProductionSlip")
  async deleteProductionSlip(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ProductionSlipPayload> {
    return this.productionSlipService.delete(id, context);
  }

  @Mutation("restoreProductionSlip")
  async restoreProductionSlip(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ProductionSlipPayload> {
    return this.productionSlipService.restore(id, context);
  }
}
