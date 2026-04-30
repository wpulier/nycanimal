import type { CatalogItem } from "@/lib/catalogSchema";

export function isCatalogItemLaunched(item: CatalogItem) {
  return item.pageStatus === "ready";
}
