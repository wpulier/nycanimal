# Google 3D Tompkins Map

The public Map tab uses Google Maps JavaScript API 3D Maps to render a live photorealistic Tompkins Square Park view. It is intentionally not a general-purpose map. The experience is bounded to the park context and overlays only curated collection pins.

## Runtime architecture

- `HomeExperience` owns the Catalog/Map tab state and the background warmup lifecycle.
- `TompkinsMap` owns Google Maps script loading, `maps3d` library loading, `Map3DElement` creation, pins, boundary, popovers, and ready/error callbacks.
- Camera control is park-centered by design. Top-down and 3D both target the Tompkins boundary centroid; zoom changes range only and then reapplies that target.
- Top-down uses tight park-context bounds. 3D uses expanded camera-position bounds because Google 3D `bounds` constrain where the camera sits, not just the point the camera looks at.
- The old illustrated/MapLibre map is not used as a browser fallback. If Google cannot load, the Map tab shows a Google setup/error state.
- Google imagery is always loaded live from Google. Do not store Google imagery, screenshots, tiles, or derived raster map backgrounds in the repo.

## Catalog-first warmup

The homepage priority is always sticker visibility first. The map must not compete with first-viewport sticker loading.

Current flow:

1. Render the Catalog tab immediately.
2. Load the first visible sticker images with eager loading and high priority only for the first couple of stickers.
3. Wait for initial viewport sticker images to load or error.
4. Call `decode()` where available.
5. Wait one animation frame so the stickers have a chance to paint.
6. During idle time, import the map component and load Google Maps libraries.
7. Mount the real Google 3D map invisibly but at full viewport size so WebGL, imagery, pins, and boundary can settle in the background.
8. Reveal the Map tab only after `TompkinsMap` reports ready.

Inactive view layers use `opacity: 0` and `pointer-events: none`, not `visibility: hidden`, because the hidden map still needs to render. Do not put `inert` on the inactive map layer; that prevents the Google 3D component from reliably reaching readiness. The inactive Catalog layer may be inert when the map is active.

## Readiness contract

`TompkinsMap` accepts:

```ts
type TompkinsMapProps = {
  items: CatalogItem[];
  onReady?: () => void;
  onError?: () => void;
};
```

`onReady` should mean the map is visually revealable, not merely that the script loaded. It fires after:

- Google Maps JavaScript API has loaded.
- `maps3d` and `marker` libraries have loaded.
- `Map3DElement` has been created and appended.
- Tompkins boundary, popover, and curated pins have been attached.
- Google reports a steady 3D map state through `gmp-steadychange` / `isSteady`.
- One additional animation frame has elapsed.

If the user taps Map before `onReady`, keep Catalog visible and mark the Map button pending. When `onReady` arrives, switch to Map. If `onError` arrives, switch to the Google unavailable state so the user is not stuck.

## Data and pin rules

Map pins are derived from `catalogItems`. The Catalog sticker board and the Map tab do not use the same placement fields:

- Catalog sticker-board placement uses `stickerLayout` and renders CSS variables such as `--sticker-x`, `--sticker-y`, and `--sticker-w`.
- Google 3D Map placement uses geographic coordinates first, then map projection fallback fields.

### Pin visibility

An item gets onto the Google 3D map through `catalogItems.<slug>.mapPin.enabled`, with a curated default allowlist for the primary first collection.

The runtime visibility rule is:

```ts
item.mapPin?.enabled ?? DEFAULT_GOOGLE_PIN_SLUGS.has(item.slug)
```

That means:

- `mapPin.enabled: true` forces an item onto the map.
- `mapPin.enabled: false` forces an item off the map.
- No `mapPin` field means only the hardcoded default slugs appear.

Current default visible slugs:

```txt
rock-pigeon
eastern-gray-squirrel
house-sparrow
american-elm
london-plane
cobblestone-edge
```

Generated tree species cards are hidden by default unless a document opts in with `mapPin.enabled: true`.

### Pin position

Map coordinates come from the catalog item itself. The runtime position precedence is:

1. `coordinates`
2. `geo`
3. projected `position.mapX` / `position.mapY`

Use `coordinates` for accurate real-world placement:

```ts
coordinates: {
  latitude: 40.72669402,
  longitude: -73.98183092
}
```

`geo` is kept as a legacy fallback. Prefer `coordinates` for new or edited items.

If neither `coordinates` nor `geo` exists, the map falls back to the older internal map-position fields:

```ts
position: {
  mapX: 63,
  mapY: 58
}
```

Those values are scaled and projected against the imported Tompkins map geometry. They are useful for rough placement, but they should not be treated as the best source for real Google 3D map pins.

### Pin display

Marker image precedence:

1. `mapPin.imageUrl`
2. `stickerImageUrl`
3. color/glyph fallback

The marker label comes from `mapPin.label` first, then `sticker`.

Pin taps open one anchored Google 3D popover with common name, optional Latin name, kind, and an `Open card` link.

## Camera and zoom rules

The map intentionally avoids raw Google gesture zoom as the main interaction. Wheel and two-finger pinch are intercepted and converted into controlled range updates around the Tompkins target. This keeps zooming from drifting toward surrounding buildings in tilted 3D mode.

- `Fit` snaps to the active preset.
- `3D` toggles the oblique testing preset without changing the park target.
- Range changes are clamped separately for top-down and 3D.
- Do not add camera-correcting writes inside Google `gmp-*change` listeners; that can create visible jitter. Range-change listeners should remain read-only except for pin scale styling.

## Google Cloud setup

Use one browser-restricted public key:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

This is not a server secret, but it must be locked down in Google Cloud.

Required setup:

1. Enable Maps JavaScript API and 3D Maps support for the Google Cloud project.
2. Create a browser API key.
3. Restrict the key by HTTP referrer.
4. Restrict the key to Maps JavaScript API.

Recommended HTTP referrers:

```txt
https://nycanimal.vercel.app/*
https://nycanimal-wpuliers-projects.vercel.app/*
https://nycanimal-git-main-wpuliers-projects.vercel.app/*
http://localhost:3000/*
http://localhost:3001/*
http://127.0.0.1:3000/*
http://127.0.0.1:3001/*
```

Avoid broad referrers unless preview deployment testing requires them. If preview deploys must render Google 3D, add the specific preview alias or a controlled `*.vercel.app` pattern.

## Hosting setup

On Vercel, set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` for Production, Preview, and Development as needed.

Next.js inlines `NEXT_PUBLIC_*` values during `next build`, so changing the Vercel environment variable does not affect an already-built deployment. Redeploy after every key change.

Production should be checked with:

```bash
REQUIRE_GOOGLE_MAPS_API_KEY=true npm run env:check
npm run map:check
npm run lint
npm run build
```

Pushing to `main` triggers production deployment for this project.

## Failure modes

- Missing key: Map tab shows a Google 3D setup message.
- API load failure or bad key restrictions: Map tab shows a Google 3D initialization error.
- 3D Maps unavailable for the project/key: Map tab shows a Google 3D initialization error.
- Google readiness never arrives: user remains on Catalog if they tapped early; investigate key restrictions, `gmp-error`, and whether the map layer is being hidden with layout-affecting CSS.

Do not restore the old map as an automatic browser fallback. The product expectation is Google 3D or an explicit setup/error state.

## Manual QA

Fresh browser or cache-busted URL:

1. Open the homepage and confirm stickers appear first.
2. Confirm the app does not switch to Map or show a black map while warming.
3. Wait briefly after stickers appear, then tap Map.
4. Confirm the 3D map is already rendered with Tompkins boundary and curated pins.
5. Wheel/pinch in top-down and 3D; zoom should stay centered on Tompkins, not move forward into the city.
6. Toggle `3D`, zoom in, and confirm the lower/front park area remains reachable instead of being pushed offscreen by camera bounds.
7. Go back to Catalog and then Map; the map should remain instant.
8. Reload and tap Map immediately; Catalog should stay visible until the map is ready, then reveal cleanly.
9. Open a pin popover and verify `Open card` navigates to the correct item page.

Useful production smoke test:

```bash
vercel inspect https://nycanimal.vercel.app
```

Then open:

```txt
https://nycanimal.vercel.app/?deploy-check=<timestamp>
```

## Source references

- [Google 3D Maps](https://mapsplatform.google.com/maps-products/3d-maps/)
- [Maps JavaScript 3D map reference](https://developers.google.com/maps/documentation/javascript/reference/3d-map)
- [3D markers](https://developers.google.com/maps/documentation/javascript/3d/marker-overview)
- [3D popovers](https://developers.google.com/maps/documentation/javascript/3d/popovers)
- [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
- [Map Tiles policies](https://developers.google.com/maps/documentation/tile/policies)
