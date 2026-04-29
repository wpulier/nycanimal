import "./load-local-env";
import { getAdminDb } from "../src/lib/firebaseAdmin";

process.env.FIREBASE_PROJECT_ID ??= "nyc-park-catalog";

async function main() {
  const snapshot = await getAdminDb().collection("treePoints").orderBy("commonName").limit(20).get();

  console.table(
    snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        commonName: data.commonName,
        latinName: data.latinName,
        catalogItemSlug: data.catalogItemSlug,
        dbh: data.dbh,
        latitude: data.coordinates?.latitude,
        longitude: data.coordinates?.longitude,
      };
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
