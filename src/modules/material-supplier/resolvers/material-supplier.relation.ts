import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import type { MaterialSupplier as PrismaMaterialSupplier } from "../../../generated/prisma/client.js";
import { MaterialLoader } from "../../material/material.loader.js";
import { SupplierLoader } from "../../supplier/supplier.loader.js";

@Resolver("MaterialSupplier")
export class MaterialSupplierRelationResolver {
  constructor(
    private readonly materialLoader: MaterialLoader,
    private readonly supplierLoader: SupplierLoader,
  ) {}

  @ResolveField("material")
  async material(@Parent() materialSupplier: PrismaMaterialSupplier) {
    if (!materialSupplier.materialId) return null;
    return this.materialLoader.byId.load(materialSupplier.materialId);
  }

  @ResolveField("supplier")
  async supplier(@Parent() materialSupplier: PrismaMaterialSupplier) {
    if (!materialSupplier.supplierId) return null;
    return this.supplierLoader.byId.load(materialSupplier.supplierId);
  }
}
