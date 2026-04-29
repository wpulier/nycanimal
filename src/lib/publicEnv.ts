export const publicEnv = {
  googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "",
} as const;

export function hasGoogleMapsApiKey() {
  return publicEnv.googleMapsApiKey.length > 0;
}
