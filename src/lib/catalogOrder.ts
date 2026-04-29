import type { CatalogItem } from "@/lib/catalogSchema";

export const primaryCatalogOrder = [
  "rock-pigeon",
  "eastern-gray-squirrel",
  "house-sparrow",
  "american-elm",
  "london-plane",
  "cobblestone-edge",
];

export function orderCatalogItems(items: CatalogItem[]) {
  const rank = new Map(primaryCatalogOrder.map((slug, index) => [slug, index]));

  return [...items].sort((a, b) => {
    const aRank = rank.get(a.slug) ?? 999;
    const bRank = rank.get(b.slug) ?? 999;
    return aRank - bRank || a.commonName.localeCompare(b.commonName);
  });
}
