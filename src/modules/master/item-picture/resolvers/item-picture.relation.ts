import { ProcessLoader } from "../../process/process.loader.js";
import { ItemLoader } from "../../item/item.loader.js";
import type { ItemPicture as PrismaItemPicture } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("ItemPicture")
export class ItemPictureRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemLoader: ItemLoader,
    private readonly processLoader: ProcessLoader,
  ) {}
  /**
   * Field resolver / relation resolver for ItemPicture.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("item")
  async item(@Parent() itemPicture: PrismaItemPicture) {
    if (!itemPicture.itemId) return null;
    return this.itemLoader.byId.load(itemPicture.itemId);
  }

  @ResolveField("process")
  async process(@Parent() itemPicture: PrismaItemPicture) {
    if (!itemPicture.processId) return null;
    return this.processLoader.byId.load(itemPicture.processId);
  }
}
