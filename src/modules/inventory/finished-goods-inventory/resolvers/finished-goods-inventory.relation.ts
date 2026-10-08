import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { AreaLoader } from "../../../master/area/area.loader.js";
import { BoxTypeLoader } from "../../../master/box-type/box-type.loader.js";
import { FabricationLoader } from "../../../master/fabrication/fabrication.loader.js";
import { ItemTypeLoader } from "../../../master/item-type/item-type.loader.js";
import { ItemLoader } from "../../../master/item/item.loader.js";
import { LocationLoader } from "../../../master/location/location.loader.js";
import { RawMaterialLoader } from "../../../master/raw-material/raw-material.loader.js";
import { FinishedGoodsInventoryLoader } from "../finished-goods-inventory.loader.js";
import { FinishedGoodsInventoryService } from "../finished-goods-inventory.service.js";
import type {
  FinishedGoodsLot as PrismaFinishedGoodsLot,
  FinishedGoodsTransaction as PrismaFinishedGoodsTransaction,
  Item as PrismaItem,
  Fabrication as PrismaFabrication,
} from "../../../../generated/prisma/client.js";

@Resolver("FinishedGoodsLot")
export class FinishedGoodsLotRelationResolver {
  constructor(
    private readonly itemLoader: ItemLoader,
    private readonly fabricationLoader: FabricationLoader,
    private readonly areaLoader: AreaLoader,
    private readonly locationLoader: LocationLoader,
    private readonly boxTypeLoader: BoxTypeLoader,
    private readonly fgLoader: FinishedGoodsInventoryLoader,
  ) {}

  @ResolveField("item")
  async item(@Parent() lot: PrismaFinishedGoodsLot) {
    if (!lot.itemId) return null;
    return this.itemLoader.byId.load(lot.itemId);
  }

  @ResolveField("fabrication")
  async fabrication(@Parent() lot: PrismaFinishedGoodsLot) {
    if (!lot.fabricationId) return null;
    return this.fabricationLoader.byId.load(lot.fabricationId);
  }

  @ResolveField("area")
  async area(@Parent() lot: PrismaFinishedGoodsLot) {
    if (!lot.areaId) return null;
    return this.areaLoader.byId.load(lot.areaId);
  }

  @ResolveField("location")
  async location(@Parent() lot: PrismaFinishedGoodsLot) {
    if (!lot.locationId) return null;
    return this.locationLoader.byId.load(lot.locationId);
  }

  @ResolveField("boxType")
  async boxType(@Parent() lot: PrismaFinishedGoodsLot) {
    if (!lot.boxId) return null;
    return this.boxTypeLoader.byId.load(lot.boxId);
  }

  @ResolveField("totalQty")
  totalQty(@Parent() lot: PrismaFinishedGoodsLot): number {
    const avl = Number(lot.availableQty ?? 0);
    const alc = Number(lot.allocatedQty ?? 0);
    const chk = Number(lot.checkingQty ?? 0);
    const def = Number(lot.defectiveQty ?? 0);
    return avl + alc + chk + def;
  }

  @ResolveField("transactions")
  async transactions(@Parent() lot: PrismaFinishedGoodsLot) {
    return this.fgLoader.transactionsByLotId.load(lot.id);
  }
}

@Resolver("FinishedGoodsTransaction")
export class FinishedGoodsTransactionRelationResolver {
  constructor(
    private readonly itemLoader: ItemLoader,
    private readonly fabricationLoader: FabricationLoader,
    private readonly areaLoader: AreaLoader,
    private readonly locationLoader: LocationLoader,
    private readonly boxTypeLoader: BoxTypeLoader,
    private readonly fgLoader: FinishedGoodsInventoryLoader,
  ) {}

  @ResolveField("item")
  async item(@Parent() tx: PrismaFinishedGoodsTransaction) {
    if (!tx.itemId) return null;
    return this.itemLoader.byId.load(tx.itemId);
  }

  @ResolveField("fabrication")
  async fabrication(@Parent() tx: PrismaFinishedGoodsTransaction) {
    if (!tx.fabricationId) return null;
    return this.fabricationLoader.byId.load(tx.fabricationId);
  }

  @ResolveField("lot")
  async lot(@Parent() tx: PrismaFinishedGoodsTransaction) {
    if (!tx.finishedGoodsLotId) return null;
    return this.fgLoader.lotById.load(tx.finishedGoodsLotId);
  }

  @ResolveField("fromArea")
  async fromArea(@Parent() tx: PrismaFinishedGoodsTransaction) {
    if (!tx.fromAreaId) return null;
    return this.areaLoader.byId.load(tx.fromAreaId);
  }

  @ResolveField("fromLocation")
  async fromLocation(@Parent() tx: PrismaFinishedGoodsTransaction) {
    if (!tx.fromLocationId) return null;
    return this.locationLoader.byId.load(tx.fromLocationId);
  }

  @ResolveField("toArea")
  async toArea(@Parent() tx: PrismaFinishedGoodsTransaction) {
    if (!tx.toAreaId) return null;
    return this.areaLoader.byId.load(tx.toAreaId);
  }

  @ResolveField("toLocation")
  async toLocation(@Parent() tx: PrismaFinishedGoodsTransaction) {
    if (!tx.toLocationId) return null;
    return this.locationLoader.byId.load(tx.toLocationId);
  }

  @ResolveField("fromBox")
  async fromBox(@Parent() tx: PrismaFinishedGoodsTransaction) {
    if (!tx.fromBoxId) return null;
    return this.boxTypeLoader.byId.load(tx.fromBoxId);
  }

  @ResolveField("toBox")
  async toBox(@Parent() tx: PrismaFinishedGoodsTransaction) {
    if (!tx.toBoxId) return null;
    return this.boxTypeLoader.byId.load(tx.toBoxId);
  }
}

@Resolver("FinishedGoodsSummary")
export class FinishedGoodsSummaryRelationResolver {
  constructor(
    private readonly itemLoader: ItemLoader,
    private readonly fabricationLoader: FabricationLoader,
    private readonly itemTypeLoader: ItemTypeLoader,
    private readonly rawMaterialLoader: RawMaterialLoader,
  ) {}

  @ResolveField("item")
  async item(@Parent() summary: any) {
    if (summary.item) return summary.item;
    if (!summary.itemId) return null;
    return this.itemLoader.byId.load(summary.itemId);
  }

  @ResolveField("fabrication")
  async fabrication(@Parent() summary: any) {
    if (summary.fabrication) return summary.fabrication;
    if (!summary.fabricationId) return null;
    return this.fabricationLoader.byId.load(summary.fabricationId);
  }

  @ResolveField("itemType")
  async itemType(@Parent() summary: any) {
    const item = summary.item ?? (summary.itemId ? await this.itemLoader.byId.load(summary.itemId) : null);
    if (!item?.itemTypeId) return null;
    return this.itemTypeLoader.byId.load(item.itemTypeId);
  }

  @ResolveField("rawMaterial")
  async rawMaterial(@Parent() summary: any) {
    const item = summary.item ?? (summary.itemId ? await this.itemLoader.byId.load(summary.itemId) : null);
    if (!item?.rawMaterialId) return null;
    return this.rawMaterialLoader.byId.load(item.rawMaterialId);
  }
}

@Resolver("Item")
export class ItemFinishedGoodsExtensionResolver {
  constructor(
    private readonly fgLoader: FinishedGoodsInventoryLoader,
    private readonly service: FinishedGoodsInventoryService,
  ) {}

  @ResolveField("finishedGoodsLots")
  async finishedGoodsLots(@Parent() item: PrismaItem) {
    return this.fgLoader.lotsByItemId.load(item.id);
  }

  @ResolveField("finishedGoodsTransactions")
  async finishedGoodsTransactions(@Parent() item: PrismaItem) {
    return this.fgLoader.transactionsByItemId.load(item.id);
  }

  @ResolveField("finishedGoodsSummaries")
  async finishedGoodsSummaries(@Parent() item: PrismaItem) {
    const res = await this.service.findSummaries(null, { itemId: { equals: item.id } });
    return res.nodes;
  }
}

@Resolver("Fabrication")
export class FabricationFinishedGoodsExtensionResolver {
  constructor(
    private readonly fgLoader: FinishedGoodsInventoryLoader,
    private readonly service: FinishedGoodsInventoryService,
  ) {}

  @ResolveField("finishedGoodsLots")
  async finishedGoodsLots(@Parent() fab: PrismaFabrication) {
    return this.fgLoader.lotsByFabricationId.load(fab.id);
  }

  @ResolveField("finishedGoodsTransactions")
  async finishedGoodsTransactions(@Parent() fab: PrismaFabrication) {
    return this.fgLoader.transactionsByFabricationId.load(fab.id);
  }

  @ResolveField("finishedGoodsSummary")
  async finishedGoodsSummary(@Parent() fab: PrismaFabrication) {
    return this.service.findSummaryByItemAndFab(fab.itemId, fab.id);
  }
}
