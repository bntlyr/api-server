import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { AreaLoader } from "../../../master/area/area.loader.js";
import { LocationLoader } from "../../../master/location/location.loader.js";
import { MaterialLoader } from "../../../master/material/material.loader.js";
import { SupplierLoader } from "../../../master/supplier/supplier.loader.js";
import { MaterialInventoryLoader } from "../material-inventory.loader.js";
import { MaterialInventoryService } from "../material-inventory.service.js";
import type {
  MaterialInventoryLot as PrismaMaterialInventoryLot,
  MaterialInventoryTransaction as PrismaMaterialInventoryTransaction,
  Material as PrismaMaterial,
} from "../../../../generated/prisma/client.js";

@Resolver("MaterialInventoryLot")
export class MaterialInventoryLotRelationResolver {
  constructor(
    private readonly materialLoader: MaterialLoader,
    private readonly areaLoader: AreaLoader,
    private readonly locationLoader: LocationLoader,
    private readonly supplierLoader: SupplierLoader,
    private readonly lotLoader: MaterialInventoryLoader,
  ) {}

  @ResolveField("material")
  async material(@Parent() lot: PrismaMaterialInventoryLot) {
    if (!lot.materialId) return null;
    return this.materialLoader.byId.load(lot.materialId);
  }

  @ResolveField("area")
  async area(@Parent() lot: PrismaMaterialInventoryLot) {
    if (!lot.areaId) return null;
    return this.areaLoader.byId.load(lot.areaId);
  }

  @ResolveField("location")
  async location(@Parent() lot: PrismaMaterialInventoryLot) {
    if (!lot.locationId) return null;
    return this.locationLoader.byId.load(lot.locationId);
  }

  @ResolveField("supplier")
  async supplier(@Parent() lot: PrismaMaterialInventoryLot) {
    if (!lot.supplierId) return null;
    return this.supplierLoader.byId.load(lot.supplierId);
  }

  @ResolveField("totalQty")
  totalQty(@Parent() lot: PrismaMaterialInventoryLot): number {
    const avl = Number(lot.availableQty ?? 0);
    const alc = Number(lot.allocatedQty ?? 0);
    const pnd = Number(lot.pendingQty ?? 0);
    const def = Number(lot.defectiveQty ?? 0);
    return avl + alc + pnd + def;
  }

  @ResolveField("transactions")
  async transactions(@Parent() lot: PrismaMaterialInventoryLot) {
    return this.lotLoader.transactionsByLotId.load(lot.id);
  }
}

@Resolver("MaterialInventoryTransaction")
export class MaterialInventoryTransactionRelationResolver {
  constructor(
    private readonly materialLoader: MaterialLoader,
    private readonly areaLoader: AreaLoader,
    private readonly locationLoader: LocationLoader,
    private readonly lotLoader: MaterialInventoryLoader,
  ) {}

  @ResolveField("material")
  async material(@Parent() tx: PrismaMaterialInventoryTransaction) {
    if (!tx.materialId) return null;
    return this.materialLoader.byId.load(tx.materialId);
  }

  @ResolveField("lot")
  async lot(@Parent() tx: PrismaMaterialInventoryTransaction) {
    if (!tx.materialInventoryLotId) return null;
    return this.lotLoader.lotById.load(tx.materialInventoryLotId);
  }

  @ResolveField("fromArea")
  async fromArea(@Parent() tx: PrismaMaterialInventoryTransaction) {
    if (!tx.fromAreaId) return null;
    return this.areaLoader.byId.load(tx.fromAreaId);
  }

  @ResolveField("fromLocation")
  async fromLocation(@Parent() tx: PrismaMaterialInventoryTransaction) {
    if (!tx.fromLocationId) return null;
    return this.locationLoader.byId.load(tx.fromLocationId);
  }

  @ResolveField("toArea")
  async toArea(@Parent() tx: PrismaMaterialInventoryTransaction) {
    if (!tx.toAreaId) return null;
    return this.areaLoader.byId.load(tx.toAreaId);
  }

  @ResolveField("toLocation")
  async toLocation(@Parent() tx: PrismaMaterialInventoryTransaction) {
    if (!tx.toLocationId) return null;
    return this.locationLoader.byId.load(tx.toLocationId);
  }
}

@Resolver("Material")
export class MaterialInventoryExtensionResolver {
  constructor(
    private readonly lotLoader: MaterialInventoryLoader,
    private readonly service: MaterialInventoryService,
  ) {}

  @ResolveField("inventoryLots")
  async inventoryLots(@Parent() material: PrismaMaterial) {
    return this.lotLoader.lotsByMaterialId.load(material.id);
  }

  @ResolveField("inventoryTransactions")
  async inventoryTransactions(@Parent() material: PrismaMaterial) {
    return this.lotLoader.transactionsByMaterialId.load(material.id);
  }

  @ResolveField("inventorySummary")
  async inventorySummary(@Parent() material: PrismaMaterial) {
    return this.service.findSummaryByMaterialId(material.id);
  }
}
