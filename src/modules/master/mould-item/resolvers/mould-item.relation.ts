import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import type { MouldItem as PrismaMouldItem } from "../../../../generated//prisma/client.js";
import { ItemLoader } from "../../item/item.loader.js";
import { MouldLoader } from "../../mould/mould.loader.js";

@Resolver("MouldItem")
export class MouldItemRelationResolver {
  constructor(
    private readonly mouldLoader: MouldLoader,
    private readonly itemLoader: ItemLoader,
  ) {}

  @ResolveField("mould")
  async mould(@Parent() mouldItem: PrismaMouldItem) {
    if (!mouldItem.mouldId) return null;
    return this.mouldLoader.byId.load(mouldItem.mouldId);
  }

  @ResolveField("item")
  async item(@Parent() mouldItem: PrismaMouldItem) {
    if (!mouldItem.itemId) return null;
    return this.itemLoader.byId.load(mouldItem.itemId);
  }
}
