import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import type { StatusCode as PrismaStatusCode } from "../../../generated/prisma/client.js";
import { CustomerLoader } from "../../customer/customer.loader.js";
import { SupplierLoader } from "../../supplier/supplier.loader.js";
import { UserLoader } from "../../user/user.loader.js";

@Resolver("StatusCode")
export class StatusCodeRelationResolver {
  constructor(
    private readonly userLoader: UserLoader,
    private readonly customerLoader: CustomerLoader,
    private readonly supplierLoader: SupplierLoader,
  ) {}

  @ResolveField("users")
  async users(@Parent() statusCode: PrismaStatusCode) {
    return this.userLoader.byStatusCodeId.load(statusCode.id);
  }

  @ResolveField("customers")
  async customers(@Parent() statusCode: PrismaStatusCode) {
    return this.customerLoader.byStatusCodeId.load(statusCode.id);
  }

  @ResolveField("suppliers")
  async suppliers(@Parent() statusCode: PrismaStatusCode) {
    return this.supplierLoader.byStatusCodeId.load(statusCode.id);
  }
}
