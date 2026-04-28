import { catalogItems as localCatalogItems } from "@/data/catalog";
import { catalogItemSchema, type CatalogItem } from "@/lib/catalogSchema";

export const localCatalogFallback: CatalogItem[] = localCatalogItems.map((item) =>
  catalogItemSchema.parse({
    ...item,
    mediaRefs: [],
    searchNames: [item.commonName, item.sticker, item.latinName]
      .filter(Boolean)
      .map((name) => String(name).toLowerCase()),
    status: "published",
  }),
);
