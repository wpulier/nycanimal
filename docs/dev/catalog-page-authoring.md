# Catalog page authoring guide

This guide is for developers who are assigned one catalog item, such as `rock-pigeon`, `eastern-gray-squirrel`, `american-elm`, or a future flower/fungus/object. The goal is simple: each item can become its own creative world, while the app keeps one clean data and asset system.

## Core idea

Each catalog item has three connected surfaces:

1. Firestore `catalogItems/<slug>` stores the canonical item data.
2. Firebase Storage stores heavy media under `media/<slug>/<role>/...`.
3. `src/catalog/<slug>/` owns the custom React experience for that item page.

The homepage sticker, map marker/popover, and `/items/<slug>` page all point back to the same `catalogItems` document. Do not create one-off data paths for your page.

## What you own

If you are assigned `eastern-gray-squirrel`, your main code surface is:

```txt
src/catalog/eastern-gray-squirrel/
  index.ts
  Experience.tsx
  SquirrelModelStage.tsx
  SquirrelThreeScene.ts
  other-local-components.tsx
```

Use that folder for item-specific components, sketches, animation helpers, Three.js stages, canvas code, SVG diagrams, scroll scenes, and page-only logic.

Do not put large binary assets in this folder. Large media belongs in Firebase Storage and is referenced through Firestore `mediaAssets`.

## Runtime source of truth

Production data comes from Firestore first. Local files such as `src/data/catalog.ts` are useful for seed data and local development, but once a document exists in Firestore, the deployed app renders that Firestore document.

This matters for layout and assets:

- Editing `src/data/catalog.ts` does not automatically change `catalogItems` in Firebase.
- Run the seed/upload scripts intentionally when Firestore should change.
- `status: "published"` makes an item visible in the public collection; `status: "draft"` keeps it hidden.
- A published item without `stickerImageUrl` is treated as coming soon: it can appear as a muted placeholder sticker/map pin, but it does not link to a detail page.
- `stickerImageUrl` on `catalogItems/<slug>` is the fast homepage image path.
- Uploading a `sticker` media asset launches the item because the uploader sets `stickerImageUrl` and `stickerAssetId`.
- `mediaRefs` points detail pages to the richer `mediaAssets` records.
- The app owns a few curated first-screen sticker layouts in `HomeExperience` so stale Firestore layout data cannot break the opening composition.
- Uploaded/non-curated items can still use `catalogItems.<slug>.stickerLayout` for art direction.

Firebase is not changing values by itself. It is a remote database. If the live site does not match a local file edit, the live Firestore document is probably still winning.

## Data model

`catalogItems` is one document per species/concept, not one per photo, tree instance, or sighting.

Important fields:

```ts
{
  slug: string;              // document id, route id, storage path segment
  commonName: string;        // display name
  latinName?: string;        // scientific name if relevant
  kind: "bird" | "plant" | "tree" | "mammal" | "insect" | "fungus" | "object";
  sticker: string;           // tiny homepage sticker id label
  color: string;             // theme color
  summary: string;
  seasonalNote: string;
  facts: string[];
  experienceKey?: string;    // chooses bespoke React page
  stickerImageUrl?: string;  // fast homepage sticker image; presence makes the item launched/clickable
  stickerAssetId?: string;   // mediaAssets id for sticker
  mediaRefs: string[];       // mediaAssets ids
  coordinates?: { latitude: number; longitude: number };
  stickerLayout?: {
    x: number;               // homepage percent x
    y: number;               // homepage pixel y
    width: number;           // sticker width in px
    rotate: number;          // degrees
    zIndex?: number;
    featured?: boolean;
  };
}
```

`treePoints` is one document per physical NYC Parks tree. A tree point links back to a species page with `catalogItemSlug`. Do not create duplicate species pages for every physical tree.

## Media model

`mediaAssets` is one document per uploaded file. Page code resolves assets by role.

Supported roles:

- `sticker`: transparent PNG/WebP cutout for homepage and item art.
- `model`: GLB/GLTF 3D model.
- `photo`: still image.
- `video`: MP4/WebM.
- `gif`: small looping animated GIF.
- `texture`: visual texture or background material.
- `diagram`: explanatory graphic.
- `audio`: MP3/WAV.
- `reference`: source/reference asset.

Storage path convention:

```txt
media/<item-slug>/<role>/<asset-id>-<safe-file-name>
```

Examples:

```txt
media/eastern-gray-squirrel/sticker/a25d...-result.png
media/eastern-gray-squirrel/model/e583...-model.glb
media/rock-pigeon/video/<id>-pigeon-walk.mp4
media/american-elm/texture/<id>-elm-bark.webp
```

This gives us item-level organization without committing huge files to Git.

## Uploading assets

Use the uploader. Do not manually paste Firebase URLs into code.

```bash
npm run upload:media -- <item-slug> <role> <absolute-file-path>
```

Examples:

```bash
npm run upload:media -- eastern-gray-squirrel sticker /Users/willpulier/Downloads/result.png
npm run upload:media -- eastern-gray-squirrel model /Users/willpulier/Downloads/model.glb
npm run upload:media -- rock-pigeon video /Users/willpulier/Downloads/pigeon-walk.mp4
```

What this does:

- Uploads the file to Firebase Storage.
- Creates `mediaAssets/<asset-id>`.
- Appends `<asset-id>` to `catalogItems/<slug>.mediaRefs`.
- If role is `sticker`, updates `catalogItems/<slug>.stickerImageUrl` and `stickerAssetId`.

Required local env:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-admin.json
FIREBASE_PROJECT_ID=nyc-park-catalog
FIREBASE_STORAGE_BUCKET=nyc-park-catalog.firebasestorage.app
```

Full Firebase details are in `firebase-media-operations.md`.

## Creating a bespoke page

1. Create the item folder:

```txt
src/catalog/<slug>/
```

2. Add `Experience.tsx`:

```tsx
import { firstMediaByRole, mediaByRole, stickerImage } from "@/components/item-experiences/media";
import type { ItemPageData } from "@/lib/itemPageData";

export function ExampleExperience({ data }: { data: ItemPageData }) {
  const item = data.catalogItem;
  const sticker = stickerImage(data);
  const model = firstMediaByRole(data, "model");
  const photos = mediaByRole(data, "photo");

  return (
    <main>
      <h1>{item.commonName}</h1>
      {sticker ? <img src={sticker} alt="" /> : null}
    </main>
  );
}
```

3. Add `index.ts`:

```ts
import type { CatalogExperienceConfig } from "@/catalog/types";
import { ExampleExperience } from "@/catalog/<slug>/Experience";

export const exampleExperience = {
  slug: "<slug>",
  experienceKey: "<slug>",
  Experience: ExampleExperience,
  media: [
    {
      role: "sticker",
      required: true,
      purpose: "Transparent homepage and hero sticker.",
    },
    {
      role: "photo",
      required: false,
      purpose: "Optional field photos for the page.",
    },
  ],
} satisfies CatalogExperienceConfig;
```

4. Register it in `src/components/item-experiences/registry.tsx`:

```ts
import { exampleExperience } from "@/catalog/<slug>";

const experienceRegistry = {
  [exampleExperience.experienceKey]: exampleExperience.Experience,
};
```

5. Set Firestore `catalogItems/<slug>.experienceKey` to the same key.

## Page creative freedom

Inside your item folder, you can build almost anything browser-native React supports:

- Scroll stories.
- SVG diagrams.
- Canvas sketches.
- Three.js scenes.
- Video-driven lessons.
- Audio/narration players.
- Interactive anatomy diagrams.
- Seasonal photo timelines.
- Shader or WebGL experiments.

Keep shared app code small. If an idea is unique to squirrel, put it in `src/catalog/eastern-gray-squirrel/`. If it becomes useful to many pages, then extract it carefully into a shared component.

## Item-owned 3D and heavy interaction

Interactive work should stay inside the assigned item folder. For example, the squirrel page owns:

```txt
src/catalog/eastern-gray-squirrel/
  Experience.tsx
  SquirrelModelStage.tsx      // React mount/unmount wrapper
  SquirrelThreeScene.ts       // Three.js, GLTFLoader, OrbitControls
```

That means squirrel can have touch OrbitControls, GLB loading, custom lights, and scene cleanup without importing Three.js into the homepage, map, pigeon page, or shared shell.

Rules:

- Put page-specific Three.js/canvas/WebGL code in `src/catalog/<slug>/`.
- Use a tiny client wrapper when browser APIs are needed.
- Dispose controls, renderers, geometries, materials, and event listeners on unmount.
- Do not import item-owned 3D code from shared components.
- If a required asset is missing, fix Firebase. Do not add visible production fallback badges that mask bad data.

## Asset lookup rules

Use role helpers:

```ts
const sticker = stickerImage(data);
const model = firstMediaByRole(data, "model");
const photos = mediaByRole(data, "photo");
const videos = mediaByRole(data, "video");
```

Do not hardcode Firebase URLs in React files. Do not scan Firebase Storage from the client. Do not assume file names. Firestore `mediaAssets` is the index.

If your page truly requires an asset, make it explicit:

```ts
if (!model) {
  throw new Error("eastern-gray-squirrel requires a published model media asset.");
}
```

Fix missing required media in Firebase. Do not hide broken required media behind visible production fallback labels.

## Sticker homepage rules

The homepage is the sticker catalog. It should load immediately and stay tactile.

Speed rules:

- Homepage reads `catalogItems` only.
- Homepage uses `stickerImageUrl`; it should not resolve every `mediaAssets` document.
- Published items without `stickerImageUrl` render as coming-soon placeholders and are not clickable.
- The first visible sticker images are prioritized; map warm-up runs only after sticker load has started.
- Keep the first screen visually dense, but avoid horizontal overflow and large offscreen animation work.

For each item:

- `stickerImageUrl` should point to a transparent sticker asset.
- Leave `stickerImageUrl` empty for visible-but-unlaunched future collection items.
- `sticker` should be a tiny ID label, not a full UI label.
- `stickerLayout` can art-direct placement.
- Stickers should not overflow horizontally.
- Stickers may overlap casually, not aggressively.

Good sticker assets:

- Transparent PNG or WebP.
- Clean alpha edge.
- Subject fills the frame without huge empty padding.
- Reasonable display size. Do not upload massive originals unless needed.

Homepage rendering uses `catalogItems` directly for speed. It does not fetch every media asset on first paint.

## Map rules

The map is a spatial interaction layer, not the main catalog page.

- Curated item markers come from `catalogItems` coordinates/map data.
- Coming-soon item pins can appear on the map, but their popovers should not link to `/items/<slug>`.
- Physical tree dots come from `treePoints`.
- Tapping a dot should show a compact card first, not immediately route away.
- The card can link to the shared species/concept page.

If you add a plant/tree page, use `coordinates` and `treeRefs` when relevant so the map can place it correctly.

## Performance expectations

Speed is a product feature. Design wild pages, but keep the initial path fast.

Defaults:

- Homepage sticker images should be lightweight.
- Heavy page assets should lazy-load inside the item page.
- GLBs should be compressed and loaded only inside client components.
- Videos should be MP4/WebM, not giant GIFs.
- Use `preload="none"` or lazy behavior for media below the fold.
- Avoid importing Three.js or video-heavy libraries into the homepage.
- Keep item-specific dependencies inside item-owned client components when possible.

The homepage currently prioritizes the first visible sticker images, then warms the map after those stickers load and the browser is idle.

## What not to do

- Do not commit large PNGs, videos, GLBs, or audio files to the repo.
- Do not create duplicate catalog pages for each individual tree/photo/sighting.
- Do not store raw media blobs in Firestore.
- Do not hardcode Firebase download URLs in page code.
- Do not loosen Firebase Storage rules to make client writes easy.
- Do not move experimental item logic into global components until it is genuinely reusable.
- Do not hide missing required media with visible placeholder badges in production.

## Dev checklist for one assigned item

Before starting:

1. Confirm the item slug, e.g. `eastern-gray-squirrel`.
2. Confirm `catalogItems/<slug>` exists in Firestore.
3. Create or inspect `src/catalog/<slug>/`.
4. Decide required media roles.
5. Upload required media with `npm run upload:media`.
6. Confirm `npm run list:media` shows the new assets.

Before opening a PR/deploy:

1. `npm run check` passes.
2. Homepage sticker still loads and links to `/items/<slug>`.
3. `/items/<slug>` uses the bespoke experience.
4. Other item pages still load.
5. Required assets are loaded through `mediaAssets`, not hardcoded URLs.
6. Mobile viewport is usable first.
7. Expensive animation/video/3D does not affect the homepage bundle.

## Useful files

- `src/catalog/types.ts`: config contract for item-owned folders.
- `src/components/item-experiences/registry.tsx`: maps `experienceKey` to bespoke page component.
- `src/components/item-experiences/media.ts`: media role helpers.
- `src/lib/catalogSchema.ts`: Firestore schema definitions.
- `src/lib/itemPageData.ts`: normalized page data shape.
- `scripts/upload-media-asset.ts`: trusted local media uploader.
- `firebase-media-operations.md`: Firebase Storage operational details.
- `catalog-experiences.md`: short architecture overview.
