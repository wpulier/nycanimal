This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deployment

Set production environment variables before running `next build`. Public `NEXT_PUBLIC_*` values are inlined into the browser bundle at build time, so changing them in the host requires a redeploy.

Developer docs live in [docs/dev](docs/dev/README.md).

For the Google 3D map key, follow [docs/dev/google-3d-map-deployment.md](docs/dev/google-3d-map-deployment.md). Run `npm run env:check` before deploy; set `REQUIRE_GOOGLE_MAPS_API_KEY=true` in CI if production should fail when the Google key is missing.
