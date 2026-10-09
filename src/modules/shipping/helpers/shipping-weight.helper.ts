export class ShippingWeightHelper {
  /**
   * Recalculates and updates net and gross weights for a PalletContainer
   */
  static async recalculatePalletWeight(prisma: any, palletContainerId: number): Promise<{
    tareWeight: number;
    netWeight: number;
    grossWeight: number;
    boxCount: number;
  }> {
    const pallet = await prisma.palletContainer.findUnique({
      where: { id: palletContainerId },
      include: {
        palletType: true,
        boxContainers: {
          where: { deleted: false },
        },
      },
    });

    if (!pallet) {
      throw new Error(`PalletContainer with ID ${palletContainerId} not found`);
    }

    const tareWeight = Number(pallet.palletType?.weight ?? pallet.tareWeight ?? 0);
    let netWeight = 0;
    let boxGrossWeight = 0;

    for (const box of pallet.boxContainers) {
      netWeight += Number(box.netWeight || 0);
      boxGrossWeight += Number(box.grossWeight || 0);
    }

    const grossWeight = tareWeight + boxGrossWeight;

    await prisma.palletContainer.update({
      where: { id: palletContainerId },
      data: {
        tareWeight: Math.round(tareWeight * 100) / 100,
        netWeight: Math.round(netWeight * 100) / 100,
        grossWeight: Math.round(grossWeight * 100) / 100,
      },
    });

    return {
      tareWeight,
      netWeight,
      grossWeight,
      boxCount: pallet.boxContainers.length,
    };
  }
}
