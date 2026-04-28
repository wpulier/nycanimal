import "./load-local-env";
import { getAdminDb } from "../src/lib/firebaseAdmin";

process.env.FIREBASE_PROJECT_ID ??= "nyc-park-catalog";

async function main() {
  const snapshot = await getAdminDb().collection("mediaAssets").orderBy("createdAt", "desc").limit(20).get();

  console.table(
    snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        itemSlug: data.itemSlug,
        role: data.role,
        fileName: data.fileName,
        contentType: data.contentType,
      };
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
