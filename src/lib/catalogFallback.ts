import { allCatalogItems as localCatalogItems } from "@/data/catalog";
import { catalogItemSchema, withCatalogItemDefaults, type CatalogItem } from "@/lib/catalogSchema";

export const localCatalogFallback: CatalogItem[] = localCatalogItems.map((item) =>
  catalogItemSchema.parse(
    withCatalogItemDefaults({
      ...item,
      mediaRefs: [],
      searchNames: [item.commonName, item.sticker, item.latinName]
        .filter(Boolean)
        .map((name) => String(name).toLowerCase()),
      status: "published",
    }),
  ),
);
