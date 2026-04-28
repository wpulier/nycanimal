import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { catalogItemSchema } from "@/lib/catalogSchema";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const snapshot = await getAdminDb().collection("catalogItems").orderBy("commonName").get();
  const items = snapshot.docs.map((catalogDoc) => ({ id: catalogDoc.id, ...catalogDoc.data() }));

  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = catalogItemSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid catalog item", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const item = { ...parsed.data, status: parsed.data.status ?? "published" };
  const docRef = getAdminDb().collection("catalogItems").doc(item.slug);
  const existing = await docRef.get();

  await docRef.set(
    {
      ...item,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: existing.exists ? existing.get("createdAt") : FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return NextResponse.json({ id: item.slug, collection: "catalogItems" }, { status: 201 });
}
