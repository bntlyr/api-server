import { RawMaterialLoader } from "../../raw-material/raw-material.loader.js";
import type { RawMaterialRotation as PrismaRawMaterialRotation } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("RawMaterialRotation")
export class RawMaterialRotationRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rawMaterialLoader: RawMaterialLoader,
  ) {}
  /**
   * Field resolver / relation resolver for RawMaterialRotation.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("rawMaterial")
  async rawMaterial(@Parent() rawMaterialRotation: PrismaRawMaterialRotation) {
    if (!rawMaterialRotation.rawMaterialId) return null;
    return this.rawMaterialLoader.byId.load(rawMaterialRotation.rawMaterialId);
  }
}
