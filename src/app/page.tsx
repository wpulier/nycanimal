import { HomeExperience } from "@/components/HomeExperience";
import { getPublishedCatalogItemsAdmin } from "@/lib/catalogServer";

export const revalidate = 60;

export default async function Home() {
  const initialItems = await getPublishedCatalogItemsAdmin();
  return <HomeExperience initialItems={initialItems} />;
}
