import "server-only";

import {
  catalogLocationSchema,
  catalogItemSchema,
  mediaAssetSchema,
  treePointSchema,
  type CatalogItem,
  type CatalogLocation,
  type MediaAsset,
  type TreePoint,
  withCatalogItemDefaults,
} from "@/lib/catalogSchema";
import { tompkinsTreeCatalogLocations } from "@/data/catalogLocations";
import { localCatalogFallback } from "@/lib/catalogFallback";
import { getAdminDb } from "@/lib/firebaseAdmin";
import type { ItemPageData } from "@/lib/itemPageData";

function normalizeItem(raw: unknown): CatalogItem | null {
  const parsed = catalogItemSchema.safeParse(withCatalogItemDefaults(raw));
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

function normalizeLocation(raw: unknown): CatalogLocation | null {
  const parsed = catalogLocationSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function isPublicLocation(location: CatalogLocation) {
  return location.visibility === "public";
}

function locationToTreePoint(location: CatalogLocation, item: CatalogItem): TreePoint | null {
  if (location.locationType !== "individual-tree") return null;

  return treePointSchema.parse({
    id: location.tree?.nycTreeId ?? location.source.sourceId ?? location.id,
    catalogItemSlug: location.catalogItemSlug,
    commonName: item.commonName,
    latinName: item.latinName,
    dbh: location.tree?.dbh,
    condition: location.tree?.condition,
    structure: location.tree?.structure,
    riskRating: location.tree?.riskRating,
    updatedDate: location.tree?.updatedDate,
    coordinates: location.coordinates,
    mapPoint: location.mapPoint,
    treeMapUrl: location.source.url,
    source: "nyc-parks-forestry-tree-points",
  });
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

export async function getPublicCatalogLocationsAdmin() {
  try {
    const snapshot = await getAdminDb().collection("catalogLocations").get();
    const locations = snapshot.docs
      .map((locationDoc) => normalizeLocation(locationDoc.data()))
      .filter((location): location is CatalogLocation => Boolean(location))
      .filter(isPublicLocation);

    return locations.length ? locations : tompkinsTreeCatalogLocations;
  } catch {
    return tompkinsTreeCatalogLocations;
  }
}

async function getPublicCatalogLocationsForItemAdmin(slug: string) {
  try {
    const snapshot = await getAdminDb()
      .collection("catalogLocations")
      .where("catalogItemSlug", "==", slug)
      .get();
    const locations = snapshot.docs
      .map((locationDoc) => normalizeLocation(locationDoc.data()))
      .filter((location): location is CatalogLocation => Boolean(location))
      .filter(isPublicLocation);

    return locations.length ? locations : tompkinsTreeCatalogLocations.filter((location) => location.catalogItemSlug === slug);
  } catch {
    return tompkinsTreeCatalogLocations.filter((location) => location.catalogItemSlug === slug);
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
    const [mediaSnapshot, treeSnapshot, locations] = await Promise.all([
      db.collection("mediaAssets").where("itemSlug", "==", slug).get(),
      db.collection("treePoints").where("catalogItemSlug", "==", slug).limit(120).get(),
      getPublicCatalogLocationsForItemAdmin(slug),
    ]);

    const mediaAssets = mediaSnapshot.docs
      .map((mediaDoc) => normalizeMediaAsset(mediaDoc.data()))
      .filter((asset): asset is MediaAsset => Boolean(asset))
      .sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999) || a.fileName.localeCompare(b.fileName));

    const treePoints = treeSnapshot.docs
      .map((treeDoc) => normalizeTreePoint(treeDoc.data()))
      .filter((treePoint): treePoint is TreePoint => Boolean(treePoint));
    const compatibilityTreePoints = locations
      .map((location) => locationToTreePoint(location, catalogItem))
      .filter((treePoint): treePoint is TreePoint => Boolean(treePoint));

    return {
      catalogItem,
      mediaAssets: mediaAssets.length ? mediaAssets : fallbackMediaForItem(catalogItem),
      locations,
      treePoints: compatibilityTreePoints.length ? compatibilityTreePoints : treePoints,
    };
  } catch {
    const locations = tompkinsTreeCatalogLocations.filter((location) => location.catalogItemSlug === slug);
    const compatibilityTreePoints = locations
      .map((location) => locationToTreePoint(location, catalogItem))
      .filter((treePoint): treePoint is TreePoint => Boolean(treePoint));

    return {
      catalogItem,
      mediaAssets: fallbackMediaForItem(catalogItem),
      locations,
      treePoints: compatibilityTreePoints,
    };
  }
}
