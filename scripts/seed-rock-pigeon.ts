import { FieldValue } from "firebase-admin/firestore";
import "./load-local-env";
import { catalogItemSchema } from "../src/lib/catalogSchema";
import { getAdminDb } from "../src/lib/firebaseAdmin";

process.env.FIREBASE_PROJECT_ID ??= "nyc-park-catalog";
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??= "nyc-park-catalog.firebasestorage.app";

const rockPigeon = catalogItemSchema.parse({
  slug: "rock-pigeon",
  commonName: "Rock Pigeon",
  latinName: "Columba livia",
  kind: "bird",
  sticker: "Pigeon",
  color: "#a7b7ff",
  angle: -8,
  position: { catalogX: 10, catalogY: 18, mapX: 54, mapY: 42 },
  summary:
    "The park's most visible city bird, adapted to pavement, benches, crumbs, ledges, and crowds.",
  seasonalNote:
    "Visible year-round, with extra activity around open lawns and paths after lunch hours.",
  pageMode: "scroll-story",
  facts: [
    "Descended from cliff-nesting rock doves.",
    "Uses magnetic and visual cues to navigate.",
    "Iridescent neck feathers shift with the viewing angle.",
  ],
  mediaRefs: [],
  searchNames: ["pigeon", "nyc pigeon", "city pigeon", "rock dove"],
  status: "published",
});

async function main() {
  const db = getAdminDb();

  await db
    .collection("catalogItems")
    .doc(rockPigeon.slug)
    .set(
      {
        ...rockPigeon,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  console.log(`Seeded catalogItems/${rockPigeon.slug}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
