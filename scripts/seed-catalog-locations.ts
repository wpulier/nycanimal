import { FieldValue } from "firebase-admin/firestore";
import "./load-local-env";
import { buildTompkinsTreeCatalogLocations } from "../src/data/catalogLocations";
import { catalogLocationSchema } from "../src/lib/catalogSchema";
import { getAdminDb } from "../src/lib/firebaseAdmin";

process.env.FIREBASE_PROJECT_ID ??= "nyc-park-catalog";

function withoutUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined));
}

async function main() {
  const db = getAdminDb();
  const batch = db.batch();
  const importedAt = new Date().toISOString();
  const locations = buildTompkinsTreeCatalogLocations(importedAt).map((location) => catalogLocationSchema.parse(location));
  const activeLocations = locations.filter((location) => location.status === "active");

  for (const location of locations) {
    batch.set(
      db.collection("catalogLocations").doc(location.id),
      {
        ...withoutUndefined(location),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await batch.commit();
  console.log(`Seeded ${locations.length} catalogLocations (${activeLocations.length} active).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
