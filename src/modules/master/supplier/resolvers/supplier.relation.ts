import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import type { Supplier as PrismaSupplier } from "../../../../generated/prisma/client.js";
import { MaterialSupplierLoader } from "../../material-supplier/material-supplier.loader.js";
import { StatusCodeLoader } from "../../../common/status-code/status-code.loader.js";

@Resolver("Supplier")
export class SupplierRelationResolver {
  constructor(
    private readonly materialSupplierLoader: MaterialSupplierLoader,
    private readonly statusCodeLoader: StatusCodeLoader,
  ) {}

  @ResolveField("statusCode")
  async statusCode(@Parent() supplier: PrismaSupplier) {
    if (!supplier.statusCodeId) return null;
    return this.statusCodeLoader.byId.load(supplier.statusCodeId);
  }

  @ResolveField("materialSuppliers")
  async materialSuppliers(@Parent() supplier: PrismaSupplier) {
    return this.materialSupplierLoader.bySupplierId.load(supplier.id);
  }
}
