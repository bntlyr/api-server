import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import type { Supplier as PrismaSupplier } from "../../../../generated/prisma/client.js";
import { MaterialSupplierLoader } from "../../material-supplier/material-supplier.loader.js";
import { StatusCodeLoader } from "../../../common/status-code/status-code.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";

@Resolver("Supplier")
export class SupplierRelationResolver {
  constructor(
    private readonly materialSupplierLoader: MaterialSupplierLoader,
    private readonly statusCodeLoader: StatusCodeLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() supplier: PrismaSupplier) {
    return resolveAuditEmployeeId(supplier.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() supplier: PrismaSupplier) {
    return resolveAuditEmployeeId(supplier.updatedBy, this.userLoader);
  }

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
