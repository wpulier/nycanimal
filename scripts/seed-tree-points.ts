import { FieldValue } from "firebase-admin/firestore";
import "./load-local-env";
import { catalogItems } from "../src/data/catalog";
import { tompkinsMapData } from "../src/data/tompkinsMap";
import { catalogItemSlugForTreeSpecies } from "../src/data/treeSpeciesCatalog";
import { treePointSchema } from "../src/lib/catalogSchema";
import { getAdminDb } from "../src/lib/firebaseAdmin";

process.env.FIREBASE_PROJECT_ID ??= "nyc-park-catalog";

function withoutUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined));
}

function treeLatinName(rawTree: (typeof tompkinsMapData.trees)[number]) {
  return "latinName" in rawTree ? rawTree.latinName : undefined;
}

async function main() {
  const db = getAdminDb();
  const batch = db.batch();
  let seededTreePoints = 0;

  for (const rawTree of tompkinsMapData.trees) {
    if ("active" in rawTree && !rawTree.active) continue;

    const latinName = treeLatinName(rawTree);
    const treePoint = treePointSchema.parse({
      id: rawTree.id,
      catalogItemSlug: catalogItemSlugForTreeSpecies(rawTree.commonName, latinName, catalogItems),
      commonName: rawTree.commonName,
      latinName,
      dbh: rawTree.dbh,
      condition: rawTree.condition,
      structure: rawTree.structure,
      riskRating: "riskRating" in rawTree ? rawTree.riskRating : undefined,
      updatedDate: "updatedDate" in rawTree ? rawTree.updatedDate : undefined,
      coordinates: {
        latitude: rawTree.point.lat,
        longitude: rawTree.point.lng,
      },
      mapPoint: {
        x: rawTree.point.x,
        y: rawTree.point.y,
      },
      treeMapUrl: rawTree.treeMapUrl,
      source: "nyc-parks-forestry-tree-points",
    });

    batch.set(
      db.collection("treePoints").doc(treePoint.id),
      {
        ...withoutUndefined(treePoint),
        updatedAt: FieldValue.serverTimestamp(),
        importedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    seededTreePoints += 1;
  }

  batch.set(
    db.collection("mapMetadata").doc("tompkins-square-park"),
    {
      ...tompkinsMapData.metadata,
      sources: tompkinsMapData.sources,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  await batch.commit();
  console.log(`Seeded ${seededTreePoints} active treePoints and mapMetadata/tompkins-square-park.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
