import type { CreateItemInput, UpdateItemInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the Item module.
 */
export function validateCreateItemInput(input: CreateItemInput): string | null {
  if (!input.itemCode || input.itemCode.trim() === "") {
    return "itemCode is required";
  }
  if (!input.itemName || input.itemName.trim() === "") {
    return "itemName is required";
  }
  if (!input.colorCode || input.colorCode.trim() === "") {
    return "colorCode is required";
  }
  if (!input.color || input.color.trim() === "") {
    return "color is required";
  }
  if (!input.specification || input.specification.trim() === "") {
    return "specification is required";
  }
  if (!input.drawingProductNo || input.drawingProductNo.trim() === "") {
    return "drawingProductNo is required";
  }
  if (!input.drawingRevisionNo || input.drawingRevisionNo.trim() === "") {
    return "drawingRevisionNo is required";
  }
  return null;
}

export function validateUpdateItemInput(_input: UpdateItemInput): string | null {
  return null;
}
