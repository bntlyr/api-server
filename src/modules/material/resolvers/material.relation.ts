import { MaterialSupplierLoader } from "../../material-supplier/material-supplier.loader.js";
import { RawMaterialLoader } from "../../raw-material/raw-material.loader.js";
import { SectionLoader } from "../../section/section.loader.js";
import { MaterialGroupLoader } from "../../material-group/material-group.loader.js";
import type { Material as PrismaMaterial } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("Material")
export class MaterialRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly materialGroupLoader: MaterialGroupLoader,
    private readonly sectionLoader: SectionLoader,
    private readonly rawMaterialLoader: RawMaterialLoader,
    private readonly materialSupplierLoader: MaterialSupplierLoader,
  ) {}
  /**
   * Field resolver / relation resolver for Material.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("materialGroup")
  async materialGroup(@Parent() material: PrismaMaterial) {
    if (!material.materialGroupId) return null;
    return this.materialGroupLoader.byId.load(material.materialGroupId);
  }

  @ResolveField("section")
  async section(@Parent() material: PrismaMaterial) {
    if (!material.sectionId) return null;
    return this.sectionLoader.byId.load(material.sectionId);
  }

  @ResolveField("rawMaterial")
  async rawMaterial(@Parent() material: PrismaMaterial) {
    if (!material.rawMaterialId) return null;
    return this.rawMaterialLoader.byId.load(material.rawMaterialId);
  }

  @ResolveField("materialSuppliers")
  async materialSuppliers(@Parent() material: PrismaMaterial) {
    return this.materialSupplierLoader.byMaterialId.load(material.id);
  }
}
