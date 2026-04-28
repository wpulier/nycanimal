import { FieldValue } from "firebase-admin/firestore";
import "./load-local-env";
import { catalogItems } from "../src/data/catalog";
import { catalogItemSchema } from "../src/lib/catalogSchema";
import { getAdminDb } from "../src/lib/firebaseAdmin";

process.env.FIREBASE_PROJECT_ID ??= "nyc-park-catalog";
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??= "nyc-park-catalog.firebasestorage.app";

async function main() {
  const db = getAdminDb();
  const batch = db.batch();

  for (const rawItem of catalogItems) {
    const item = catalogItemSchema.parse({
      ...rawItem,
      mediaRefs: [],
      searchNames: [rawItem.commonName, rawItem.sticker, rawItem.latinName]
        .filter(Boolean)
        .map((name) => String(name).toLowerCase()),
      status: "published",
    });

    const ref = db.collection("catalogItems").doc(item.slug);
    batch.set(
      ref,
      {
        ...item,
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
