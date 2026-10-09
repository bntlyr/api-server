import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { SalesOrderService } from "../sales-order.service.js";
import type {
  CreateSalesOrderInput,
  UpdateSalesOrderInput,
  UploadSalesOrdersInput,
  SalesOrderPayload,
  SalesOrderUploadResult,
} from "../../../../generated/graphql/types.js";

@Resolver("SalesOrder")
export class SalesOrderMutationResolver {
  constructor(private readonly service: SalesOrderService) {}

  @Mutation("createSalesOrder")
  async createSalesOrder(
    @Args("input") input: CreateSalesOrderInput,
    @Context() context: any,
  ): Promise<SalesOrderPayload> {
    return this.service.create(input, context);
  }

  @Mutation("updateSalesOrder")
  async updateSalesOrder(
    @Args("id") id: string,
    @Args("input") input: UpdateSalesOrderInput,
    @Context() context: any,
  ): Promise<SalesOrderPayload> {
    return this.service.update(id, input, context);
  }

  @Mutation("deleteSalesOrder")
  async deleteSalesOrder(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<SalesOrderPayload> {
    return this.service.delete(id, context);
  }

  @Mutation("restoreSalesOrder")
  async restoreSalesOrder(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<SalesOrderPayload> {
    return this.service.restore(id, context);
  }

  @Mutation("cancelSalesOrder")
  async cancelSalesOrder(
    @Args("id") id: string,
    @Args("reason", { nullable: true }) reason?: string | null,
    @Context() context?: any,
  ): Promise<SalesOrderPayload> {
    return this.service.cancel(id, reason, context);
  }

  @Mutation("uploadSalesOrders")
  async uploadSalesOrders(
    @Args("input") input: UploadSalesOrdersInput,
    @Context() context: any,
  ): Promise<SalesOrderUploadResult> {
    return this.service.uploadSalesOrders(input, context);
  }
}
