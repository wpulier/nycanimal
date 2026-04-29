# Catalog experience folders

For the full assigned-developer workflow, read [../../docs/dev/catalog-page-authoring.md](../../docs/dev/catalog-page-authoring.md).

Each bespoke catalog item can own a folder in `src/catalog/<item-slug>/`.

The folder is for code and page-specific organization, not large binary assets. Heavy media stays in Firebase Storage under the matching item path, for example `media/eastern-gray-squirrel/model/...`, and Firestore `mediaAssets` records connect those files to the item.

## Folder contract

A bespoke folder should export a `CatalogExperienceConfig` from `index.ts`:

- `slug`: the `catalogItems` document id.
- `experienceKey`: the key stored on the catalog item and used by the registry.
- `Experience`: the React component for `/items/<slug>`.
- `media`: the roles this page expects, so future devs can see the asset contract without searching Firestore.

## Runtime data

Every `Experience` receives the same normalized `ItemPageData` object:

- `catalogItem`: species/concept data from `catalogItems`.
- `mediaAssets`: all linked media from Firebase Storage, indexed by Firestore `mediaAssets`.
- `treePoints`: physical tree instances when relevant.

Use `mediaByRole(data, "sticker")`, `firstMediaByRole(data, "model")`, or `stickerImage(data)` to resolve assets. Do not hardcode Firebase URLs in page components.

## Adding a new bespoke page

1. Create `src/catalog/<slug>/`.
2. Add `Experience.tsx` and any page-owned helpers/components.
3. Export a config from `index.ts`.
4. Add the config to `src/components/item-experiences/registry.tsx`.
5. Upload assets with `npm run upload:media -- <slug> <role> <file-path>`.
6. Set `catalogItems/<slug>.experienceKey` to the same key.

A broken route-level experience affects that item page. Shared schemas, upload tooling, and the registry should stay small and stable.
