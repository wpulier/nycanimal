# Firebase media operations

This app stays fast by keeping Firestore documents small and serving heavy assets directly from Firebase Storage download URLs. Firestore is the index. Storage is the blob store. Item pages must not scan buckets at runtime.

## Current setup

- Firebase project: `nyc-park-catalog`
- Firebase Storage bucket: `nyc-park-catalog.firebasestorage.app`
- Firestore collections used by the app:
  - `catalogItems`: one document per species/concept/sticker page.
  - `mediaAssets`: one document per uploaded media file.
  - `treePoints`: one document per physical NYC Parks tree instance.
- Required env vars for server/admin uploads:
  - `GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-admin.json` locally, or `FIREBASE_SERVICE_ACCOUNT_JSON` on Vercel.
  - `FIREBASE_PROJECT_ID=nyc-park-catalog`.
  - `FIREBASE_STORAGE_BUCKET=nyc-park-catalog.firebasestorage.app`.

Uploads use the Firebase Admin SDK. Objects are saved with `firebaseStorageDownloadTokens`, and `mediaAssets.downloadUrl` uses this shape:

```txt
https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encoded-storage-path>?alt=media&token=<token>
```

The browser should use `mediaAssets.downloadUrl` exactly as stored. Do not derive URLs in page code.

## Security rules

The default Storage rules can deny client reads and writes. That is fine for this architecture because:

- Server/admin upload paths use Firebase Admin SDK credentials.
- Public app media is delivered through tokenized Firebase download URLs stored in Firestore.
- Browser clients should not write directly to Storage in V1.

If we later add public visitor submissions, use a separate reviewed upload path and explicit rules. Do not loosen global Storage writes for convenience.

## CORS for browser media

Images can render without special handling, but GLB/video/audio fetches need browser CORS. The Firebase Storage bucket is configured for:

- `https://nycanimal.vercel.app`
- `http://localhost:3000`
- `http://127.0.0.1:3000`

If a new deploy domain is added, update bucket CORS with the same policy shape:

```json
[
  {
    "origin": ["https://nycanimal.vercel.app", "http://localhost:3000", "http://127.0.0.1:3000"],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": ["Content-Type", "Range", "Accept-Ranges", "Content-Range"],
    "maxAgeSeconds": 3600
  }
]
```

Command, using the local service account key:

```bash
CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE=./secrets/firebase-admin.json \\
  gcloud storage buckets update gs://nyc-park-catalog.firebasestorage.app \\
  --cors-file=/path/to/firebase-storage-cors.json
```

## Local credentials

`.env.local` should include:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-admin.json
FIREBASE_PROJECT_ID=nyc-park-catalog
FIREBASE_STORAGE_BUCKET=nyc-park-catalog.firebasestorage.app
```

`secrets/*.json` is gitignored. Do not commit service account JSON.

## Media roles

Supported roles are defined in `src/lib/catalogSchema.ts`:

- `sticker`: transparent PNG/WebP cutout used by homepage and item pages.
- `model`: GLB/GLTF 3D model for Three.js or other 3D experiences.
- `photo`: still image used inside an item page.
- `video`: MP4/WebM video.
- `gif`: animated GIF, only for small looping motion.
- `texture`: image used as a background/material/visual texture.
- `diagram`: explanatory image/SVG/graphic.
- `audio`: MP3/WAV field audio or narration.
- `reference`: source/reference asset that is linked but not primary UI media.

Add a new role only when page code needs to treat that asset class differently.

## Upload command

Use the generalized uploader for trusted local uploads:

```bash
npm run upload:media -- <item-slug> <role> <absolute-file-path>
```

Examples:

```bash
npm run upload:media -- eastern-gray-squirrel sticker /Users/willpulier/Downloads/result.png
npm run upload:media -- eastern-gray-squirrel model /Users/willpulier/Downloads/model.glb
npm run upload:media -- rock-pigeon video /Users/willpulier/Downloads/pigeon-walk.mp4
npm run upload:media -- american-elm texture /Users/willpulier/Downloads/elm-bark.webp
```

The uploader writes to item-scoped Storage paths:

```txt
media/<item-slug>/<role>/<asset-id>-<safe-file-name>
```

It then creates `mediaAssets/<asset-id>` and appends the asset id to `catalogItems/<item-slug>.mediaRefs`.

For `sticker` uploads only, it also updates:

- `catalogItems/<item-slug>.stickerAssetId`
- `catalogItems/<item-slug>.stickerImageUrl`

Those two fields keep the homepage fast.

## Firestore document shapes

A `mediaAssets` document must include:

```ts
{
  id: string;
  itemSlug: string;
  role: "sticker" | "model" | "photo" | "video" | "gif" | "texture" | "diagram" | "audio" | "reference";
  storagePath: string;
  downloadUrl: string;
  fileName: string;
  contentType: string;
  size: number;
  status: "draft" | "published";
  caption?: string;
  alt?: string;
  credit?: string;
  sortOrder?: number;
  width?: number;
  height?: number;
  tags: string[];
}
```

A `catalogItems` document remains the page/species source of truth. It stores identity, summary, facts, coordinates/layout, `experienceKey`, and media references. It should not duplicate large media payloads.

## Item-owned code folders

Each bespoke item can have its own code folder:

```txt
src/catalog/<item-slug>/
  index.ts
  Experience.tsx
  OptionalClientStage.tsx
```

Heavy media does not go in that folder. The folder owns the page code and declares expected media roles. Actual media files live in Firebase Storage under the same item slug.

Example:

```txt
Code:
  src/catalog/eastern-gray-squirrel/Experience.tsx
  src/catalog/eastern-gray-squirrel/SquirrelModelStage.tsx

Storage:
  media/eastern-gray-squirrel/sticker/...
  media/eastern-gray-squirrel/model/...

Firestore:
  catalogItems/eastern-gray-squirrel
  mediaAssets/<sticker-id>
  mediaAssets/<model-id>
```

## Runtime asset lookup

Item pages receive `ItemPageData` from the server. Use role helpers rather than hardcoded URLs:

```ts
const sticker = stickerImage(data);
const model = firstMediaByRole(data, "model");
const photos = mediaByRole(data, "photo");
```

If an experience requires a specific asset, enforce that contract in that item folder. Do not render visible placeholder/fallback badges in production UI just to hide broken data. Missing required media should be fixed in Firebase.

## Performance rules

Speed is a product feature. Follow these defaults:

- Render the homepage from `catalogItems` and `stickerImageUrl`; do not query every `mediaAssets` doc for first paint.
- Use transparent PNG or WebP for stickers. Prefer WebP for smaller assets after art is finalized.
- Keep stickers reasonably sized. Do not upload 4000px art unless needed.
- Use MP4/WebM for video; avoid large GIFs except tiny loops.
- Use GLB for 3D. Keep GLBs compressed where possible; large models should lazy-load inside client-only components.
- Use `public, max-age=31536000, immutable` cache headers for content-addressed uploaded assets.
- Never put large media in Git/Vercel unless it is tiny, permanent, and intentionally part of the app shell.

## Common failure modes

### `The specified bucket does not exist`

The configured `FIREBASE_STORAGE_BUCKET` does not exist or is not accessible by the Admin SDK. Correct value:

```bash
FIREBASE_STORAGE_BUCKET=nyc-park-catalog.firebasestorage.app
```

If this fails, check Firebase Console -> Storage and GCP IAM for the service account.

### Upload works but browser cannot load the asset

Check these in order:

1. `mediaAssets.downloadUrl` opens in the browser.
2. The URL uses `firebasestorage.googleapis.com/v0/b/nyc-park-catalog.firebasestorage.app`.
3. The token query param exists.
4. `contentType` is correct (`model/gltf-binary`, `image/png`, `video/mp4`, etc.).
5. Large models/videos support normal browser fetches.

### Page does not show the new sticker

Confirm:

```bash
npm run list:media
npm run list:catalog
```

Then check `catalogItems/<slug>` has `stickerImageUrl` and `stickerAssetId`. Only `role=sticker` updates those fields automatically.

## Access needed if blocked

If uploads or bucket setup are blocked, ask for access instead of creating a workaround:

- Firebase Console access to enable Storage.
- Google Cloud access to inspect bucket existence/IAM in project `nyc-park-catalog`.
- Permission for the service account to write Firebase Storage objects.
- Confirmation before changing Storage security rules.
