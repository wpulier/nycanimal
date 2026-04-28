# Vercel deployment

## Git deployment

Repository: `https://github.com/wpulier/nycanimal`

The Vercel project is connected to this repository. Pushing to `main` triggers a production deployment.

## Required Vercel environment variables

Set these for Production, Preview, and Development in Vercel:

```txt
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
FIREBASE_PROJECT_ID
FIREBASE_SERVICE_ACCOUNT_JSON
ADMIN_API_TOKEN
```

`FIREBASE_SERVICE_ACCOUNT_JSON` must be the full JSON contents of `secrets/firebase-admin.json` on one line or pasted as a multiline Vercel secret value. Do not expose it with `NEXT_PUBLIC_`.

## Deploy

```bash
npm run check
git push origin main
```

After deploy, open `/admin`, paste `ADMIN_API_TOKEN`, upload a sticker, then confirm it appears on the public catalog and item page.
