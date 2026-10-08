import { DefaultRouteLoader } from "../../default-route/default-route.loader.js";
import { ItemLoader } from "../../item/item.loader.js";
import { MouldTypeLoader } from "../../mould-type/mould-type.loader.js";
import type { ItemType as PrismaItemType } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("ItemType")
export class ItemTypeRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mouldTypeLoader: MouldTypeLoader,
    private readonly itemLoader: ItemLoader,
    private readonly defaultRouteLoader: DefaultRouteLoader,
  ) {}
  /**
   * Field resolver / relation resolver for ItemType.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("mouldTypes")
  async mouldTypes(@Parent() itemType: PrismaItemType) {
    return this.mouldTypeLoader.byItemTypeId.load(itemType.id);
  }

  @ResolveField("items")
  async items(@Parent() itemType: PrismaItemType) {
    return this.itemLoader.byItemTypeId.load(itemType.id);
  }

  @ResolveField("defaultRoute")
  async defaultRoute(@Parent() itemType: PrismaItemType) {
    return this.defaultRouteLoader.byItemTypeId.load(itemType.id);
  }
}
