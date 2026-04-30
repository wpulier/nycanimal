import type { CatalogItem, CatalogLocation, MediaAsset, TreePoint } from "@/lib/catalogSchema";

export type ItemPageData = {
  catalogItem: CatalogItem;
  mediaAssets: MediaAsset[];
  locations: CatalogLocation[];
  treePoints: TreePoint[];
};
