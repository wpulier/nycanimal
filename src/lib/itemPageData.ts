import type { CatalogItem, MediaAsset, TreePoint } from "@/lib/catalogSchema";

export type ItemPageData = {
  catalogItem: CatalogItem;
  mediaAssets: MediaAsset[];
  treePoints: TreePoint[];
};
