import { MaterialLoader } from "../../material/material.loader.js";
import type { MaterialGroup as PrismaMaterialGroup } from "../../../generated/prisma/client.js";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("MaterialGroup")
export class MaterialGroupRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly materialLoader: MaterialLoader,
  ) {}
  /**
   * Field resolver / relation resolver for MaterialGroup.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("materials")
  async materials(@Parent() materialGroup: PrismaMaterialGroup) {
    return this.materialLoader.byMaterialGroupId.load(materialGroup.id);
  }
}
