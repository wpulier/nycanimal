import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import { readFile, stat } from "node:fs/promises";
import { FieldValue } from "firebase-admin/firestore";
import "./load-local-env";
import { getAdminBucket, getAdminDb } from "../src/lib/firebaseAdmin";

process.env.FIREBASE_PROJECT_ID ??= "nyc-park-catalog";
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??= "nyc-park-catalog.firebasestorage.app";

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "sticker.png";
}

function downloadUrl(bucketName: string, storagePath: string, token: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

async function main() {
  const [, , itemSlug, filePath] = process.argv;

  if (!itemSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(itemSlug)) {
    throw new Error("Usage: npm run upload:sticker -- <item-slug> <png-path>");
  }

  if (!filePath) {
    throw new Error("Missing PNG path.");
  }

  const fileStats = await stat(filePath);
  const id = randomUUID();
  const fileName = safeFileName(basename(filePath));
  const storagePath = `media/${itemSlug}/sticker/${id}-${fileName}`;
  const token = randomUUID();
  const buffer = await readFile(filePath);
  const bucket = getAdminBucket();

  await bucket.file(storagePath).save(buffer, {
    contentType: "image/png",
    metadata: {
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  const asset = {
    id,
    itemSlug,
    role: "sticker" as const,
    storagePath,
    downloadUrl: downloadUrl(bucket.name, storagePath, token),
    fileName,
    contentType: "image/png",
    size: fileStats.size,
    status: "published" as const,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const db = getAdminDb();
  await db.collection("mediaAssets").doc(id).set(asset);
  await db.collection("catalogItems").doc(itemSlug).set(
    {
      mediaRefs: FieldValue.arrayUnion(id),
      stickerAssetId: id,
      stickerImageUrl: asset.downloadUrl,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  console.log(JSON.stringify({ asset }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
