import "server-only";

import { catalogItemSchema, type CatalogItem } from "@/lib/catalogSchema";
import { localCatalogFallback } from "@/lib/catalogFallback";
import { getAdminDb } from "@/lib/firebaseAdmin";

function normalizeItem(raw: unknown): CatalogItem | null {
  const parsed = catalogItemSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function getPublishedCatalogItemsAdmin() {
  try {
    const snapshot = await getAdminDb()
      .collection("catalogItems")
      .where("status", "==", "published")
      .get();
    const items = snapshot.docs
      .map((catalogDoc) => normalizeItem(catalogDoc.data()))
      .filter((item): item is CatalogItem => Boolean(item));

    return items.length ? items : localCatalogFallback;
  } catch {
    return localCatalogFallback;
  }
}

export async function getCatalogItemAdmin(slug: string) {
  try {
    const snapshot = await getAdminDb().collection("catalogItems").doc(slug).get();
    const item = snapshot.exists ? normalizeItem(snapshot.data()) : null;
    return item ?? localCatalogFallback.find((fallbackItem) => fallbackItem.slug === slug) ?? null;
  } catch {
    return localCatalogFallback.find((fallbackItem) => fallbackItem.slug === slug) ?? null;
  }
}
