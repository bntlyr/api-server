export const SHIPPING_RULES = {
  MAX_PALLETS_PER_SHIPMENT: 30,
  MAX_BOXES_PER_PALLET: 40,
  MAX_BOXES_PER_SHIPMENT: 30 * 40, // 1200
  DEFAULT_COUNTRY_CODE: "P",
  STARTING_BOX_INDEX: 1,
} as const;

export class ShippingRulesValidator {
  static validateTotalBoxCapacity(boxCount: number, force = false): void {
    if (boxCount <= 0) {
      throw new Error("Shipment must contain at least 1 box.");
    }
    if (!force && boxCount > SHIPPING_RULES.MAX_BOXES_PER_SHIPMENT) {
      throw new Error(
        `Total boxes (${boxCount}) exceeds shipment limit of ${SHIPPING_RULES.MAX_BOXES_PER_SHIPMENT} boxes (max ${SHIPPING_RULES.MAX_PALLETS_PER_SHIPMENT} pallets). Set force: true to override.`,
      );
    }
  }

  static validatePalletBoxLimit(currentCount: number, incomingCount = 1, maxCapacity = 40, force = false): void {
    if (!force && currentCount + incomingCount > maxCapacity) {
      throw new Error(
        `Pallet capacity exceeded (${currentCount + incomingCount} > ${maxCapacity}). Set force: true to override.`,
      );
    }
  }

  static validateShipmentPalletLimit(currentPallets: number, incomingPallets = 1, maxLimit = 30, force = false): void {
    if (!force && currentPallets + incomingPallets > maxLimit) {
      throw new Error(
        `Shipment pallet limit exceeded (${currentPallets + incomingPallets} > ${maxLimit}). Set force: true to override.`,
      );
    }
  }

  static validatePalletUnsealed(sealStatus: string): void {
    if (sealStatus === "SEALED") {
      throw new Error("Cannot modify a SEALED pallet. Please unseal it first.");
    }
  }

  static validateShipmentEditable(status: string): void {
    if (status !== "PREPARING") {
      throw new Error(`Cannot modify shipment in ${status} status. Only PREPARING shipments can be modified.`);
    }
  }
}
