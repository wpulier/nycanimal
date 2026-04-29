import "./load-local-env";

function isTruthy(value: string | undefined) {
  return value === "1" || value?.toLowerCase() === "true" || value?.toLowerCase() === "yes";
}

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
const requireGoogleMapsApiKey = isTruthy(process.env.REQUIRE_GOOGLE_MAPS_API_KEY);

if (!googleMapsApiKey) {
  console.warn(
    "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing. The Map tab will show a Google 3D setup message until the key is set before build.",
  );

  if (requireGoogleMapsApiKey) {
    console.error("REQUIRE_GOOGLE_MAPS_API_KEY is true, so this environment is not deploy-ready.");
    process.exit(1);
  }
} else {
  console.log("Public env OK: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is present.");
}

console.log("Reminder: NEXT_PUBLIC_* values are inlined during `next build`; update hosting env vars before redeploying.");
