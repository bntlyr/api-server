import { ItemLoader } from "../../item/item.loader.js";
import type { BoxType as PrismaBoxType } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("BoxType")
export class BoxTypeRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly itemLoader: ItemLoader,
  ) {}
  /**
   * Field resolver / relation resolver for BoxType.
   * Extend this with relations as the schema grows.
   */

  @ResolveField("items")
  async items(@Parent() boxType: PrismaBoxType) {
    return this.itemLoader.byBoxTypeId.load(boxType.id);
  }
}
