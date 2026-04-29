import { FieldValue } from "firebase-admin/firestore";
import "./load-local-env";
import { allCatalogItems as catalogItems } from "../src/data/catalog";
import { catalogItemSchema } from "../src/lib/catalogSchema";
import { getAdminDb } from "../src/lib/firebaseAdmin";

process.env.FIREBASE_PROJECT_ID ??= "nyc-park-catalog";
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??= "nyc-park-catalog.firebasestorage.app";

function withoutUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined));
}

async function main() {
  const db = getAdminDb();
  const batch = db.batch();

  for (const rawItem of catalogItems) {
    const ref = db.collection("catalogItems").doc(rawItem.slug);
    const existing = await ref.get();
    const existingData = existing.data() ?? {};
    const item = catalogItemSchema.parse({
      ...rawItem,
      mediaRefs: "mediaRefs" in rawItem ? rawItem.mediaRefs : existingData.mediaRefs ?? [],
      stickerAssetId: "stickerAssetId" in rawItem ? rawItem.stickerAssetId : existingData.stickerAssetId,
      stickerImageUrl: "stickerImageUrl" in rawItem ? rawItem.stickerImageUrl : existingData.stickerImageUrl,
      searchNames: [rawItem.commonName, rawItem.sticker, rawItem.latinName]
        .filter(Boolean)
        .map((name) => String(name).toLowerCase()),
      status: "published",
    });

    batch.set(
      ref,
      {
        ...withoutUndefined(item),
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await batch.commit();
  console.log(`Seeded ${catalogItems.length} catalog items.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
