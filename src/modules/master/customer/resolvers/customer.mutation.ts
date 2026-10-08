import { Args, Context, Mutation, Resolver } from "@nestjs/graphql";
import { CustomerService } from "../customer.service.js";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerPayload,
} from "../../../../generated//graphql/types.js";

@Resolver("Customer")
export class CustomerMutationResolver {
  constructor(private readonly customerService: CustomerService) {}

  @Mutation("createCustomer")
  async createCustomer(
    @Args("input") input: CreateCustomerInput,
    @Context() context: any,
  ): Promise<CustomerPayload> {
    return this.customerService.create(input, context);
  }

  @Mutation("updateCustomer")
  async updateCustomer(
    @Args("id") id: string,
    @Args("input") input: UpdateCustomerInput,
    @Context() context: any,
  ): Promise<CustomerPayload> {
    return this.customerService.update(id, input, context);
  }

  @Mutation("deleteCustomer")
  async deleteCustomer(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<CustomerPayload> {
    return this.customerService.delete(id, context);
  }

  @Mutation("restoreCustomer")
  async restoreCustomer(
    @Args("id") id: string,
    @Context() context: any,
  ): Promise<CustomerPayload> {
    return this.customerService.restore(id, context);
  }
}
