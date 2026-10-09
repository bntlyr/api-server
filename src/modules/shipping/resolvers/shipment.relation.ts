import { Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { PalletContainerLoader } from "../pallet-container.loader.js";
import type { Shipment } from "../../../generated/graphql/types.js";

@Resolver("Shipment")
export class ShipmentRelationResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly palletContainerLoader: PalletContainerLoader,
  ) {}

  @ResolveField("customer")
  async customer(@Parent() shipment: Shipment) {
    if (!shipment.customerId) return null;
    return this.prisma.customer.findUnique({
      where: { id: shipment.customerId },
    });
  }

  @ResolveField("defaultPalletType")
  async defaultPalletType(@Parent() shipment: Shipment) {
    if (!shipment.defaultPalletTypeId) return null;
    return this.prisma.palletType.findUnique({
      where: { id: shipment.defaultPalletTypeId },
    });
  }

  @ResolveField("pallets")
  async pallets(@Parent() shipment: Shipment) {
    return this.palletContainerLoader.byShipmentId.load(Number(shipment.id));
  }

  @ResolveField("salesOrders")
  async salesOrders(@Parent() shipment: Shipment) {
    return this.prisma.salesOrder.findMany({
      where: { shipmentId: Number(shipment.id), deleted: false },
      orderBy: { salesOrderDate: "asc" },
    });
  }

  @ResolveField("totalPallets")
  async totalPallets(@Parent() shipment: Shipment): Promise<number> {
    const pallets = await this.palletContainerLoader.byShipmentId.load(Number(shipment.id));
    return pallets.length;
  }

  @ResolveField("totalBoxes")
  async totalBoxes(@Parent() shipment: Shipment): Promise<number> {
    const pallets = await this.palletContainerLoader.byShipmentId.load(Number(shipment.id));
    if (pallets.length === 0) return 0;
    const palletIds = pallets.map((p) => p.id);
    return this.prisma.boxContainer.count({
      where: { palletContainerId: { in: palletIds }, deleted: false },
    });
  }

  @ResolveField("totalQuantity")
  async totalQuantity(@Parent() shipment: Shipment): Promise<number> {
    const pallets = await this.palletContainerLoader.byShipmentId.load(Number(shipment.id));
    if (pallets.length === 0) return 0;
    const palletIds = pallets.map((p) => p.id);
    const boxes = await this.prisma.boxContainer.findMany({
      where: { palletContainerId: { in: palletIds }, deleted: false },
      select: { totalQty: true },
    });
    return boxes.reduce((sum, b) => sum + (Number(b.totalQty) || 0), 0);
  }

  @ResolveField("totalNetWeight")
  async totalNetWeight(@Parent() shipment: Shipment): Promise<number> {
    const pallets = await this.palletContainerLoader.byShipmentId.load(Number(shipment.id));
    const total = pallets.reduce((sum, p) => sum + (Number(p.netWeight) || 0), 0);
    return Math.round(total * 100) / 100;
  }

  @ResolveField("totalGrossWeight")
  async totalGrossWeight(@Parent() shipment: Shipment): Promise<number> {
    const pallets = await this.palletContainerLoader.byShipmentId.load(Number(shipment.id));
    const total = pallets.reduce((sum, p) => sum + (Number(p.grossWeight) || 0), 0);
    return Math.round(total * 100) / 100;
  }
}
