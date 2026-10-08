import { RawMaterialLoader } from "../../raw-material/raw-material.loader.js";
import type { Melting as PrismaMelting } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("Melting")
export class MeltingRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rawMaterialLoader: RawMaterialLoader,
  ) {}
  /**
   * Field resolver / relation resolver for Melting.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("rawMaterial")
  async rawMaterial(@Parent() melting: PrismaMelting) {
    if (!melting.rawMaterialId) return null;
    return this.rawMaterialLoader.byId.load(melting.rawMaterialId);
  }
}
