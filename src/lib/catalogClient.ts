import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { catalogItemSchema, type CatalogItem } from "@/lib/catalogSchema";
import { localCatalogFallback } from "@/lib/catalogFallback";
import { db } from "@/lib/firebase";

function normalizeItem(raw: unknown): CatalogItem | null {
  const parsed = catalogItemSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function getPublishedCatalogItemsClient() {
  const catalogQuery = query(collection(db, "catalogItems"), where("status", "==", "published"));
  const snapshot = await getDocs(catalogQuery);
  const items = snapshot.docs
    .map((catalogDoc) => normalizeItem(catalogDoc.data()))
    .filter((item): item is CatalogItem => Boolean(item));

  return items.length ? items : localCatalogFallback;
}

export async function getCatalogItemClient(slug: string) {
  const snapshot = await getDoc(doc(db, "catalogItems", slug));
  const item = snapshot.exists() ? normalizeItem(snapshot.data()) : null;
  return item ?? localCatalogFallback.find((fallbackItem) => fallbackItem.slug === slug) ?? null;
}
