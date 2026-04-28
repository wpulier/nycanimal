import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { llmCatalogDraftSchema } from "@/lib/catalogSchema";
import { getAdminDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = llmCatalogDraftSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid catalog draft", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const draft = parsed.data;
  const docId = `${draft.suggestedItem.slug}-${Date.now()}`;

  await getAdminDb()
    .collection("draftCatalogItems")
    .doc(docId)
    .set({
      ...draft,
      suggestedItem: { ...draft.suggestedItem, status: "draft" },
      reviewStatus: "needs-review",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  return NextResponse.json({ id: docId, collection: "draftCatalogItems" }, { status: 201 });
}
