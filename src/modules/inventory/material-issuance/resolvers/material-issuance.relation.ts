import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { SectionLoader } from "../../../master/section/section.loader.js";
import { UserLoader } from "../../../user/user.loader.js";
import { MaterialLoader } from "../../../master/material/material.loader.js";
import { AreaLoader } from "../../../master/area/area.loader.js";
import { LocationLoader } from "../../../master/location/location.loader.js";
import { MaterialInventoryLoader } from "../../material-inventory/material-inventory.loader.js";
import { MaterialIssuanceLoader } from "../material-issuance.loader.js";
import type {
  MaterialIssuance as PrismaMaterialIssuance,
  MaterialIssuanceItem as PrismaMaterialIssuanceItem,
} from "../../../../generated/prisma/client.js";

@Resolver("MaterialIssuance")
export class MaterialIssuanceRelationResolver {
  constructor(
    private readonly sectionLoader: SectionLoader,
    private readonly userLoader: UserLoader,
    private readonly issuanceLoader: MaterialIssuanceLoader,
  ) {}

  @ResolveField("section")
  async section(@Parent() issuance: PrismaMaterialIssuance) {
    if (!issuance.sectionId) return null;
    return this.sectionLoader.byId.load(issuance.sectionId);
  }

  @ResolveField("requestor")
  async requestor(@Parent() issuance: PrismaMaterialIssuance) {
    if (!issuance.requestorId) return null;
    return this.userLoader.byId.load(issuance.requestorId);
  }

  @ResolveField("items")
  async items(@Parent() issuance: PrismaMaterialIssuance) {
    return this.issuanceLoader.itemsByIssuanceId.load(issuance.id);
  }
}

@Resolver("MaterialIssuanceItem")
export class MaterialIssuanceItemRelationResolver {
  constructor(
    private readonly materialLoader: MaterialLoader,
    private readonly lotLoader: MaterialInventoryLoader,
    private readonly areaLoader: AreaLoader,
    private readonly locationLoader: LocationLoader,
  ) {}

  @ResolveField("material")
  async material(@Parent() item: PrismaMaterialIssuanceItem) {
    if (!item.materialId) return null;
    return this.materialLoader.byId.load(item.materialId);
  }

  @ResolveField("lot")
  async lot(@Parent() item: PrismaMaterialIssuanceItem) {
    if (!item.materialInventoryLotId) return null;
    return this.lotLoader.lotById.load(item.materialInventoryLotId);
  }

  @ResolveField("area")
  async area(@Parent() item: PrismaMaterialIssuanceItem) {
    if (!item.areaId) return null;
    return this.areaLoader.byId.load(item.areaId);
  }

  @ResolveField("location")
  async location(@Parent() item: PrismaMaterialIssuanceItem) {
    if (!item.locationId) return null;
    return this.locationLoader.byId.load(item.locationId);
  }
}
