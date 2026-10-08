import { ItemLoader } from "../../item/item.loader.js";
import { MaterialLoader } from "../../material/material.loader.js";
import { MeltingLoader } from "../../melting/melting.loader.js";
import { RawMaterialRotationLoader } from "../../raw-material-rotation/raw-material-rotation.loader.js";
import type { RawMaterial as PrismaRawMaterial } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("RawMaterial")
export class RawMaterialRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rawMaterialRotationLoader: RawMaterialRotationLoader,
    private readonly meltingLoader: MeltingLoader,
    private readonly materialLoader: MaterialLoader,
    private readonly itemLoader: ItemLoader,
  ) {}
  /**
   * Field resolver / relation resolver for RawMaterial.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("rawMaterialRotations")
  async rawMaterialRotations(@Parent() rawMaterial: PrismaRawMaterial) {
    return this.rawMaterialRotationLoader.byRawMaterialId.load(rawMaterial.id);
  }

  @ResolveField("meltings")
  async meltings(@Parent() rawMaterial: PrismaRawMaterial) {
    return this.meltingLoader.byRawMaterialId.load(rawMaterial.id);
  }

  @ResolveField("materials")
  async materials(@Parent() rawMaterial: PrismaRawMaterial) {
    return this.materialLoader.byRawMaterialId.load(rawMaterial.id);
  }

  @ResolveField("items")
  async items(@Parent() rawMaterial: PrismaRawMaterial) {
    return this.itemLoader.byRawMaterialId.load(rawMaterial.id);
  }
}
