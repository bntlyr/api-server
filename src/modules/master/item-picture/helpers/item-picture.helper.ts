import type { CreateItemPictureInput, UpdateItemPictureInput } from "../../../../generated//graphql/types.js";

/**
 * Domain helper functions for the ItemPicture module.
 */
export function validateCreateItemPictureInput(input: CreateItemPictureInput): string | null {
  if (!input.title || input.title.trim() === "") {
    return "title is required";
  }
  if (!input.filename || input.filename.trim() === "") {
    return "filename is required";
  }
  if (!input.filepath || input.filepath.trim() === "") {
    return "filepath is required";
  }
  if (input.itemId === undefined || input.itemId === null) {
    return "itemId is required";
  }
  return null;
}

export function validateUpdateItemPictureInput(_input: UpdateItemPictureInput): string | null {
  return null;
}
