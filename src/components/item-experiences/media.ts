import type { ItemPageData } from "@/lib/itemPageData";
import type { MediaAsset } from "@/lib/catalogSchema";

export function mediaByRole(data: ItemPageData, role: MediaAsset["role"]) {
  return data.mediaAssets.filter((asset) => asset.role === role);
}

export function firstMediaByRole(data: ItemPageData, role: MediaAsset["role"]) {
  return mediaByRole(data, role)[0];
}

export function stickerImage(data: ItemPageData) {
  return firstMediaByRole(data, "sticker")?.downloadUrl ?? data.catalogItem.stickerImageUrl;
}
