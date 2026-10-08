import type { CreateMaterialIssuanceInput } from "../../../../generated/graphql/types.js";

export function validateCreateMaterialIssuanceInput(
  input: CreateMaterialIssuanceInput,
): string | null {
  if (!input.mrsNo || input.mrsNo.trim() === "") {
    return "MRS Number is required";
  }
  if (!input.sectionId || input.sectionId <= 0) {
    return "Valid Requestor Section ID is required";
  }
  if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
    return "At least one material issuance item is required";
  }

  for (let i = 0; i < input.items.length; i++) {
    const item = input.items[i];
    if (!item.materialInventoryLotId || item.materialInventoryLotId <= 0) {
      return `Item #${i + 1}: Valid Material Inventory Lot ID is required`;
    }
    if (!item.quantity || item.quantity <= 0) {
      return `Item #${i + 1}: Quantity must be greater than 0`;
    }
  }

  return null;
}
