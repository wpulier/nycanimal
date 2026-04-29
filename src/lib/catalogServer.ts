import "server-only";

import {
  catalogItemSchema,
  mediaAssetSchema,
  treePointSchema,
  type CatalogItem,
  type MediaAsset,
  type TreePoint,
} from "@/lib/catalogSchema";
import { localCatalogFallback } from "@/lib/catalogFallback";
import { getAdminDb } from "@/lib/firebaseAdmin";
import type { ItemPageData } from "@/lib/itemPageData";

function normalizeItem(raw: unknown): CatalogItem | null {
  const parsed = catalogItemSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function normalizeMediaAsset(raw: unknown): MediaAsset | null {
  const parsed = mediaAssetSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function normalizeTreePoint(raw: unknown): TreePoint | null {
  const parsed = treePointSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function fallbackMediaForItem(item: CatalogItem): MediaAsset[] {
  if (!item.stickerImageUrl) {
    return [];
  }

  return [
    {
      id: item.stickerAssetId ?? `${item.slug}-sticker-fallback`,
      itemSlug: item.slug,
      role: "sticker",
      storagePath: item.stickerImageUrl,
      downloadUrl: item.stickerImageUrl,
      fileName: `${item.slug}-sticker`,
      contentType: "image/png",
      size: 0,
      status: "published",
      tags: [],
    },
  ];
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

export async function getItemPageDataAdmin(slug: string): Promise<ItemPageData | null> {
  const catalogItem = await getCatalogItemAdmin(slug);

  if (!catalogItem) {
    return null;
  }

  try {
    const db = getAdminDb();
    const [mediaSnapshot, treeSnapshot] = await Promise.all([
      db.collection("mediaAssets").where("itemSlug", "==", slug).get(),
      db.collection("treePoints").where("catalogItemSlug", "==", slug).limit(120).get(),
    ]);

    const mediaAssets = mediaSnapshot.docs
      .map((mediaDoc) => normalizeMediaAsset(mediaDoc.data()))
      .filter((asset): asset is MediaAsset => Boolean(asset))
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.fileName.localeCompare(b.fileName));

    const treePoints = treeSnapshot.docs
      .map((treeDoc) => normalizeTreePoint(treeDoc.data()))
      .filter((treePoint): treePoint is TreePoint => Boolean(treePoint));

    return {
      catalogItem,
      mediaAssets: mediaAssets.length ? mediaAssets : fallbackMediaForItem(catalogItem),
      treePoints,
    };
  } catch {
    return {
      catalogItem,
      mediaAssets: fallbackMediaForItem(catalogItem),
      treePoints: [],
    };
  }
}
