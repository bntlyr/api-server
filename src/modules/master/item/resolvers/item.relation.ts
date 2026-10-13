import { MouldItemLoader } from "../../mould-item/mould-item.loader.js";
import { ItemRouteLoader } from "../../item-route/item-route.loader.js";
import { FabricationLoader } from "../../fabrication/fabrication.loader.js";
import { ItemRevisionLoader } from "../../item-revision/item-revision.loader.js";
import { ItemPictureLoader } from "../../item-picture/item-picture.loader.js";
import { BoxTypeLoader } from "../../box-type/box-type.loader.js";
import { RawMaterialLoader } from "../../raw-material/raw-material.loader.js";
import { ItemTypeLoader } from "../../item-type/item-type.loader.js";
import { CustomerLoader } from "../../customer/customer.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import { resolveAuditEmployeeId } from "../../../../graphql/common/audit-user.helper.js";
import type { Item as PrismaItem } from "../../../../generated//prisma/client.js";
import { PrismaService } from "../../../../prisma//prisma.service.js";
import { Parent, ResolveField, Resolver } from "@nestjs/graphql";

@Resolver("Item")
export class ItemRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly customerLoader: CustomerLoader,
    private readonly itemTypeLoader: ItemTypeLoader,
    private readonly rawMaterialLoader: RawMaterialLoader,
    private readonly boxTypeLoader: BoxTypeLoader,
    private readonly itemPictureLoader: ItemPictureLoader,
    private readonly itemRevisionLoader: ItemRevisionLoader,
    private readonly fabricationLoader: FabricationLoader,
    private readonly itemRouteLoader: ItemRouteLoader,
    private readonly mouldItemLoader: MouldItemLoader,
    private readonly userLoader: UserLoader,
  ) {}

  @ResolveField("createdBy")
  async createdBy(@Parent() item: PrismaItem) {
    return resolveAuditEmployeeId(item.createdBy, this.userLoader);
  }

  @ResolveField("updatedBy")
  async updatedBy(@Parent() item: PrismaItem) {
    return resolveAuditEmployeeId(item.updatedBy, this.userLoader);
  }

  @ResolveField("customer")
  async customer(@Parent() item: PrismaItem) {
    if (!item.customerId) return null;
    return this.customerLoader.byId.load(item.customerId);
  }

  @ResolveField("itemType")
  async itemType(@Parent() item: PrismaItem) {
    if (!item.itemTypeId) return null;
    return this.itemTypeLoader.byId.load(item.itemTypeId);
  }

  @ResolveField("rawMaterial")
  async rawMaterial(@Parent() item: PrismaItem) {
    if (!item.rawMaterialId) return null;
    return this.rawMaterialLoader.byId.load(item.rawMaterialId);
  }

  @ResolveField("boxType")
  async boxType(@Parent() item: PrismaItem) {
    if (!item.boxTypeId) return null;
    return this.boxTypeLoader.byId.load(item.boxTypeId);
  }

  @ResolveField("itemPictures")
  async itemPictures(@Parent() item: PrismaItem) {
    return this.itemPictureLoader.byItemId.load(item.id);
  }

  @ResolveField("itemRevisions")
  async itemRevisions(@Parent() item: PrismaItem) {
    return this.itemRevisionLoader.byItemId.load(item.id);
  }

  @ResolveField("fabrications")
  async fabrications(@Parent() item: PrismaItem) {
    return this.fabricationLoader.byItemId.load(item.id);
  }

  @ResolveField("itemRoutes")
  async itemRoutes(@Parent() item: PrismaItem) {
    return this.itemRouteLoader.byItemId.load(item.id);
  }

  @ResolveField("mouldItems")
  async mouldItems(@Parent() item: PrismaItem) {
    return this.mouldItemLoader.byItemId.load(item.id);
  }
}
