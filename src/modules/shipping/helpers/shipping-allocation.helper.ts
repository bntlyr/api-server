import { SHIPPING_RULES, ShippingRulesValidator } from "../rules/shipping.rules.js";
import { ShippingNumberGenerator } from "../utils/shipping-number.generator.js";

export interface BoxContainerAllocationItem {
  id: number;
  boxNo: string;
  grossWeight: number;
  netWeight: number;
  totalQty: number;
}

export interface AllocatedPalletStructure {
  sequenceNo: number;
  palletNo: string;
  palletTypeId?: number | null;
  maxCapacity: number;
  tareWeight: number;
  netWeight: number;
  grossWeight: number;
  boxes: Array<{
    id: number;
    shippingBoxNo: string;
    sequenceInPallet: number;
    grossWeight: number;
    netWeight: number;
    totalQty: number;
  }>;
}

export class ShippingAllocationHelper {
  /**
   * Calculates required pallets given total box count
   */
  static calculateNoPallets(totalBoxes: number, boxesPerPallet: number = 40, force = false): number {
    ShippingRulesValidator.validateTotalBoxCapacity(totalBoxes, force);
    return Math.ceil(totalBoxes / boxesPerPallet);
  }

  /**
   * Chunks boxes into pallets and assigns 12-digit Box numbers and sequence numbers
   */
  static chunkAndAllocateBoxes(params: {
    boxes: BoxContainerAllocationItem[];
    shipmentDate: Date;
    shipmentDailySeries: number;
    palletTypeId?: number | null;
    palletTareWeight?: number;
    startPalletSequence?: number;
    startGlobalBoxIndex?: number;
    boxesPerPallet?: number;
    force?: boolean;
  }): AllocatedPalletStructure[] {
    const {
      boxes,
      shipmentDate,
      shipmentDailySeries,
      palletTypeId,
      palletTareWeight = 0,
      startPalletSequence = 1,
      startGlobalBoxIndex = SHIPPING_RULES.STARTING_BOX_INDEX,
      boxesPerPallet = SHIPPING_RULES.MAX_BOXES_PER_PALLET,
      force = false,
    } = params;

    ShippingRulesValidator.validateTotalBoxCapacity(boxes.length, force);

    const totalPallets = this.calculateNoPallets(boxes.length, boxesPerPallet, force);
    const allocatedPallets: AllocatedPalletStructure[] = [];
    let currentGlobalBoxIndex = startGlobalBoxIndex;

    for (let p = 0; p < totalPallets; p++) {
      const palletSequence = startPalletSequence + p;
      const palletNo = ShippingNumberGenerator.generatePalletNo({
        date: shipmentDate,
        shipmentDailySeries,
        sequenceNo: palletSequence,
      });

      const startIdx = p * boxesPerPallet;
      const endIdx = Math.min(startIdx + boxesPerPallet, boxes.length);
      const palletRawBoxes = boxes.slice(startIdx, endIdx);

      let palletNetWeight = 0;
      let palletBoxGrossWeight = 0;

      const palletBoxes = palletRawBoxes.map((box, idx) => {
        const sequenceInPallet = idx + 1;
        const shippingBoxNo = ShippingNumberGenerator.generateBoxNo({
          date: shipmentDate,
          shipmentDailySeries,
          boxIndex: currentGlobalBoxIndex++,
        });

        palletNetWeight += Number(box.netWeight) || 0;
        palletBoxGrossWeight += Number(box.grossWeight) || 0;

        return {
          id: box.id,
          shippingBoxNo,
          sequenceInPallet,
          grossWeight: Number(box.grossWeight) || 0,
          netWeight: Number(box.netWeight) || 0,
          totalQty: Number(box.totalQty) || 0,
        };
      });

      allocatedPallets.push({
        sequenceNo: palletSequence,
        palletNo,
        palletTypeId,
        maxCapacity: boxesPerPallet,
        tareWeight: palletTareWeight,
        netWeight: Math.round(palletNetWeight * 100) / 100,
        grossWeight: Math.round((palletTareWeight + palletBoxGrossWeight) * 100) / 100,
        boxes: palletBoxes,
      });
    }

    return allocatedPallets;
  }
}
