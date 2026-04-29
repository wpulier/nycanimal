import { randomUUID } from "node:crypto";
import { basename, extname } from "node:path";
import { readFile, stat } from "node:fs/promises";
import { FieldValue } from "firebase-admin/firestore";
import "./load-local-env";
import { mediaRoleSchema } from "../src/lib/catalogSchema";
import { getAdminBucket, getAdminDb } from "../src/lib/firebaseAdmin";

process.env.FIREBASE_PROJECT_ID ??= "nyc-park-catalog";
process.env.FIREBASE_STORAGE_BUCKET ??= "nyc-park-catalog.firebasestorage.app";

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "upload";
}

function downloadUrl(bucketName: string, storagePath: string, token: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

function contentTypeFor(filePath: string) {
  switch (extname(filePath).toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".glb":
      return "model/gltf-binary";
    case ".gltf":
      return "model/gltf+json";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    default:
      return "application/octet-stream";
  }
}

async function main() {
  const [, , itemSlug, rawRole, filePath] = process.argv;

  if (!itemSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(itemSlug)) {
    throw new Error("Usage: npm run upload:media -- <item-slug> <role> <file-path>");
  }

  const roleResult = mediaRoleSchema.safeParse(rawRole);
  if (!roleResult.success) {
    throw new Error(`Invalid media role. Use one of: ${mediaRoleSchema.options.join(", ")}`);
  }

  if (!filePath) {
    throw new Error("Missing file path.");
  }

  const role = roleResult.data;
  const fileStats = await stat(filePath);
  const id = randomUUID();
  const fileName = safeFileName(basename(filePath));
  const storagePath = `media/${itemSlug}/${role}/${id}-${fileName}`;
  const token = randomUUID();
  const buffer = await readFile(filePath);
  const contentType = contentTypeFor(filePath);
  const bucket = getAdminBucket();

  await bucket.file(storagePath).save(buffer, {
    contentType,
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
    role,
    storagePath,
    downloadUrl: downloadUrl(bucket.name, storagePath, token),
    fileName,
    contentType,
    size: fileStats.size,
    status: "published" as const,
    tags: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const db = getAdminDb();
  await db.collection("mediaAssets").doc(id).set(asset);

  const itemUpdate: Record<string, unknown> = {
    mediaRefs: FieldValue.arrayUnion(id),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (role === "sticker") {
    itemUpdate.stickerAssetId = id;
    itemUpdate.stickerImageUrl = asset.downloadUrl;
  }

  await db.collection("catalogItems").doc(itemSlug).set(itemUpdate, { merge: true });

  console.log(JSON.stringify({ asset }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
