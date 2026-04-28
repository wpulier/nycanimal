# Admin Firestore scripts

These scripts use the Firebase Admin SDK, so they bypass browser Firestore rules and should only run with trusted credentials.

## Local credential setup

1. Firebase Console -> Project settings -> Service accounts.
2. Click `Generate new private key`.
3. Save the JSON file locally as `secrets/firebase-admin.json`.
4. Put this in `.env.local`:

```bash
GOOGLE_APPLICATION_CREDENTIALS=./secrets/firebase-admin.json
```

5. Run scripts normally:

```bash
npm run seed:catalog
npm run list:catalog
npm run list:media
```

The `secrets/*.json` path is gitignored.

## Admin studio

Run the app locally, open `/admin`, and paste the `ADMIN_API_TOKEN` from `.env.local`. The admin page can publish catalog items and upload sticker media to Firebase Storage.

## Remote LLM write flow

Use `POST /api/admin/catalog-drafts` for LLM-created candidates. It requires:

```http
Authorization: Bearer $ADMIN_API_TOKEN
Content-Type: application/json
```

Payload shape is shown in `scripts/write-catalog-draft.example.json`.

Use `POST /api/admin/catalog-items` only for trusted publishing of validated catalog items.
