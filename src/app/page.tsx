import { HomeExperience } from "@/components/HomeExperience";
import { getPublicCatalogLocationsAdmin, getPublishedCatalogItemsAdmin } from "@/lib/catalogServer";

export const revalidate = 60;

export default async function Home() {
  const [initialItems, initialLocations] = await Promise.all([
    getPublishedCatalogItemsAdmin(),
    getPublicCatalogLocationsAdmin(),
  ]);

  return <HomeExperience initialItems={initialItems} initialLocations={initialLocations} />;
}
