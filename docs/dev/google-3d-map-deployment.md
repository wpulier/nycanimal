# Google 3D Map Deployment

The 3D Tompkins map uses one public browser key:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=...
```

This is not a server secret, but it must be locked down in Google Cloud.

## Google Cloud setup

1. Enable Maps JavaScript API with 3D Maps support for the project.
2. Create a browser API key.
3. Add HTTP referrer restrictions:
   - Production domain, for example `https://your-domain.com/*`
   - Preview domain if needed, for example `https://*.vercel.app/*`
   - Local development, for example `http://localhost:3000/*` and `http://localhost:3001/*`
4. Add API restrictions for Maps JavaScript API.

## Hosting setup

On Vercel or any Next.js host, add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to Production before the production build runs. Add it to Preview only if preview deployments should render Google 3D imagery.

Next.js inlines `NEXT_PUBLIC_*` values during `next build`, so updating the key in the host does not affect an already-built deployment. Redeploy after every key change.

## Checks

```bash
npm run env:check
```

This confirms whether the public key is present without printing it. By default a missing key is allowed for local development, but the Map tab will show a Google 3D setup message instead of the old map.

For production CI that must ship the Google 3D map:

```bash
REQUIRE_GOOGLE_MAPS_API_KEY=true npm run env:check
```

## Runtime behavior

- With a valid key, the catalog page warms the Google map module/API in the background and the Map tab renders the 3D Tompkins view.
- Without a key, if the API fails, or if 3D Maps is unavailable, the Map tab shows a Google 3D setup/error message. It does not render the old map.
- Google imagery is never stored or screenshotted into the repo.
