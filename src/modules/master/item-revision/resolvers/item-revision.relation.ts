import { ItemLoader } from "../../item/item.loader.js";
import type { ItemRevision as PrismaItemRevision } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("ItemRevision")
export class ItemRevisionRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemLoader: ItemLoader,
  ) {}
  /**
   * Field resolver / relation resolver for ItemRevision.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("item")
  async item(@Parent() itemRevision: PrismaItemRevision) {
    if (!itemRevision.itemId) return null;
    return this.itemLoader.byId.load(itemRevision.itemId);
  }
}
