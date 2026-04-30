import type { CatalogItem } from "@/lib/catalogSchema";

export function isCatalogItemLaunched(item: CatalogItem) {
  return Boolean(item.stickerImageUrl);
}
