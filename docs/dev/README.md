# Developer help

Start here if you are building or maintaining catalog pages, sticker assets, Firebase media, or deployment setup.

## Page owners

If you are assigned one animal, plant, tree, fungus, insect, or object page, read this first:

- [Catalog page authoring guide](catalog-page-authoring.md)

This explains the `src/catalog/<slug>/` ownership model, how bespoke pages connect to Firestore/Firebase Storage, and how to keep experiments isolated to your item.

## Architecture references

- [Bespoke catalog experiences](catalog-experiences.md): short overview of the item-folder experience registry.
- [Firebase media operations](firebase-media-operations.md): asset uploads, media roles, Storage paths, CORS, and failure modes.
- [Google 3D map deployment](google-3d-map-deployment.md): public Maps key setup and deployment checks.

## Common tasks

Create a bespoke page:

```bash
mkdir -p src/catalog/<slug>
```

Upload a sticker:

```bash
npm run upload:media -- <slug> sticker /absolute/path/to/sticker.png
```

Upload page media:

```bash
npm run upload:media -- <slug> photo /absolute/path/to/photo.webp
npm run upload:media -- <slug> model /absolute/path/to/model.glb
npm run upload:media -- <slug> video /absolute/path/to/video.mp4
```

Verify data:

```bash
npm run list:catalog
npm run list:media
npm run check
```

## Source of truth

- Runtime data lives in Firestore. Local seed files do not update the deployed app until a seed/upload script writes Firestore.
- Heavy media lives in Firebase Storage.
- Bespoke page code lives in `src/catalog/<slug>/`.
- The homepage reads `catalogItems` and `stickerImageUrl` for speed.
- Item-specific 3D/canvas/video code stays inside `src/catalog/<slug>/` so it does not affect homepage or map loading.
