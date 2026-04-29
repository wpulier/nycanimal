import "./load-local-env";
import { getAdminDb } from "../src/lib/firebaseAdmin";

process.env.FIREBASE_PROJECT_ID ??= "nyc-park-catalog";

async function main() {
  const snapshot = await getAdminDb().collection("catalogItems").orderBy("commonName").get();

  console.table(
    snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        commonName: data.commonName,
        kind: data.kind,
        pageMode: data.pageMode,
        hasSticker: Boolean(data.stickerImageUrl),
      };
    }),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
