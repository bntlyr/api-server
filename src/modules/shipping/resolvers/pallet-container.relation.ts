import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { BoxContainerLoader } from "../../master/box-container/box-container.loader.js";
import { ShipmentLoader } from "../shipment.loader.js";
import type { PalletContainer } from "../../../generated/graphql/types.js";

@Resolver("PalletContainer")
export class PalletContainerRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly shipmentLoader: ShipmentLoader,
    private readonly boxContainerLoader: BoxContainerLoader,
  ) {}

  @ResolveField("shipment")
  async shipment(@Parent() pallet: PalletContainer) {
    return this.shipmentLoader.byId.load(pallet.shipmentId);
  }

  @ResolveField("palletType")
  async palletType(@Parent() pallet: PalletContainer) {
    if (!pallet.palletTypeId) return null;
    return this.prisma.palletType.findUnique({
      where: { id: pallet.palletTypeId },
    });
  }

  @ResolveField("boxContainers")
  async boxContainers(@Parent() pallet: PalletContainer) {
    return this.boxContainerLoader.byPalletContainerId.load(Number(pallet.id));
  }

  @ResolveField("boxCount")
  async boxCount(@Parent() pallet: PalletContainer): Promise<number> {
    const boxes = await this.boxContainerLoader.byPalletContainerId.load(Number(pallet.id));
    return boxes.length;
  }

  @ResolveField("totalQuantity")
  async totalQuantity(@Parent() pallet: PalletContainer): Promise<number> {
    const boxes = await this.boxContainerLoader.byPalletContainerId.load(Number(pallet.id));
    return boxes.reduce((sum, b) => sum + (Number(b.totalQty) || 0), 0);
  }
}
