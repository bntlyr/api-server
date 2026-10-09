import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { ProductionProcessService } from "../production-process.service.js";
import type {
  CreateProductionProcessInput,
  UpdateProductionProcessInput,
  ProductionProcessPayload,
} from "../../../../generated/graphql/types.js";

@Resolver("ProductionProcess")
export class ProductionProcessMutationResolver {
  constructor(private readonly productionProcessService: ProductionProcessService) {}

  @Mutation("createProductionProcess")
  async createProductionProcess(
    @Args("input") input: CreateProductionProcessInput,
    @Context() context: any,
  ): Promise<ProductionProcessPayload> {
    return this.productionProcessService.create(input, context);
  }

  @Mutation("updateProductionProcess")
  async updateProductionProcess(
    @Args("id") id: string,
    @Args("input") input: UpdateProductionProcessInput,
    @Context() context: any,
  ): Promise<ProductionProcessPayload> {
    return this.productionProcessService.update(id, input, context);
  }

  @Mutation("deleteProductionProcess")
  async deleteProductionProcess(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ProductionProcessPayload> {
    return this.productionProcessService.delete(id, context);
  }

  @Mutation("restoreProductionProcess")
  async restoreProductionProcess(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<ProductionProcessPayload> {
    return this.productionProcessService.restore(id, context);
  }
}
