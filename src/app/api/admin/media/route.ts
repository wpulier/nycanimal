import { randomUUID } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { mediaRoleSchema } from "@/lib/catalogSchema";
import { getAdminBucket, getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function safeFileName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "upload";
}

function downloadUrl(bucketName: string, storagePath: string, token: string) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
}

export async function POST(request: NextRequest) {
  try {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const itemSlug = String(formData.get("itemSlug") ?? "");
  const roleResult = mediaRoleSchema.safeParse(formData.get("role") ?? "sticker");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(itemSlug)) {
    return NextResponse.json({ error: "Invalid itemSlug" }, { status: 400 });
  }

  if (!roleResult.success) {
    return NextResponse.json({ error: "Invalid media role" }, { status: 400 });
  }

  const id = randomUUID();
  const role = roleResult.data;
  const fileName = safeFileName(file.name);
  const storagePath = `media/${itemSlug}/${role}/${id}-${fileName}`;
  const token = randomUUID();
  const buffer = Buffer.from(await file.arrayBuffer());
  const bucket = getAdminBucket();
  const storageFile = bucket.file(storagePath);

  await storageFile.save(buffer, {
    contentType: file.type || "application/octet-stream",
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
    contentType: file.type || "application/octet-stream",
    size: file.size,
    status: "published" as const,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const db = getAdminDb();
  await db.collection("mediaAssets").doc(id).set(asset);

  const itemRef = db.collection("catalogItems").doc(itemSlug);
  const itemUpdate: Record<string, unknown> = {
    mediaRefs: FieldValue.arrayUnion(id),
    updatedAt: FieldValue.serverTimestamp(),
  };

  if (role === "sticker") {
    itemUpdate.stickerAssetId = id;
    itemUpdate.stickerImageUrl = asset.downloadUrl;
  }

  await itemRef.set(itemUpdate, { merge: true });

  return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Media upload failed";
    const isMissingBucket = message.includes("bucket does not exist") || message.includes("Bucket name not specified");

    return NextResponse.json(
      {
        error: isMissingBucket
          ? "Firebase Storage bucket is not available. Enable Storage in Firebase Console, then retry the upload."
          : message,
      },
      { status: isMissingBucket ? 424 : 500 },
    );
  }
}
