# Bespoke catalog experiences

The app uses a hybrid model:

- Firestore `catalogItems` is the canonical species/concept record.
- Firestore `mediaAssets` is the canonical asset index.
- Firebase Storage stores heavy media under item-scoped paths like `media/eastern-gray-squirrel/model/...`.
- `src/catalog/<slug>/` owns bespoke page code for that item.

This gives each animal or plant a clear development surface without turning media into untracked local blobs or one giant global folder.

## Item-owned folders

Use `src/catalog/<slug>/` for code that is unique to one item:

```txt
src/catalog/
  eastern-gray-squirrel/
    Experience.tsx
    SquirrelModelStage.tsx
    index.ts
  rock-pigeon/
    index.ts
```

`index.ts` exports a `CatalogExperienceConfig` containing:

- `slug`: the Firestore `catalogItems` document id.
- `experienceKey`: the value used by the page registry.
- `Experience`: the React component for `/items/<slug>`.
- `media`: required and optional media roles for that page.

The `media` list is a code-level contract for developers. It does not replace Firestore; it makes expected assets obvious while keeping the runtime dynamic.

## Media organization

Do not commit large page media to the repo. Upload it instead:

```bash
npm run upload:media -- eastern-gray-squirrel sticker /path/to/squirrel.png
npm run upload:media -- eastern-gray-squirrel model /path/to/squirrel.glb
```

The upload script writes to Firebase Storage paths scoped by item and role:

```txt
media/eastern-gray-squirrel/sticker/<asset-id>-squirrel.png
media/eastern-gray-squirrel/model/<asset-id>-squirrel.glb
```

It also creates a `mediaAssets` doc and appends the asset id to `catalogItems/<slug>.mediaRefs`. Sticker uploads additionally update `stickerImageUrl` and `stickerAssetId` for homepage rendering.

## Page data contract

Every bespoke `Experience` receives `ItemPageData`:

- `catalogItem`
- `mediaAssets`
- `treePoints`

Resolve assets by role, not by hardcoded URL:

```ts
const sticker = stickerImage(data);
const model = firstMediaByRole(data, "model");
const photos = mediaByRole(data, "photo");
```

This keeps pigeon, squirrel, trees, and future plants creatively independent while preserving one shared data model.

## Adding a new page

1. Create `src/catalog/<slug>/`.
2. Add `Experience.tsx` and any local components/helpers.
3. Export a config from `index.ts`.
4. Register the config in `src/components/item-experiences/registry.tsx`.
5. Upload media with `npm run upload:media`.
6. Set `catalogItems/<slug>.experienceKey` to the config key.

Route-level mistakes are confined to that item page at runtime. Build-time TypeScript errors still block deploy, so keep shared modules minimal and item folders self-contained.

## Firebase media operations

For bucket setup, upload commands, media roles, failure modes, and performance rules, read `firebase-media-operations.md` before adding new assets.
