import { StatusCodeLoader } from "../../status-code/status-code.loader.js";
import { ItemLoader } from "../../item/item.loader.js";
import type { Customer as PrismaCustomer } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("Customer")
export class CustomerRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemLoader: ItemLoader,
    private readonly statusCodeLoader: StatusCodeLoader,
  ) {}

  @ResolveField("statusCode")
  async statusCode(@Parent() customer: PrismaCustomer) {
    if (!customer.statusCodeId) return null;
    return this.statusCodeLoader.byId.load(customer.statusCodeId);
  }

  @ResolveField("items")
  async items(@Parent() customer: PrismaCustomer) {
    return this.itemLoader.byCustomerId.load(customer.id);
  }
}
