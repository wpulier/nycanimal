import { notFound } from "next/navigation";
import { ItemPageChrome } from "@/components/ItemPageChrome";
import { ItemExperience } from "@/components/item-experiences/registry";
import { localCatalogFallback } from "@/lib/catalogFallback";
import { isCatalogItemLaunched } from "@/lib/catalogLifecycle";
import { orderCatalogItems } from "@/lib/catalogOrder";
import { getCatalogItemAdmin, getItemPageDataAdmin, getPublishedCatalogItemsAdmin } from "@/lib/catalogServer";

export const revalidate = 60;

export function generateStaticParams() {
  return localCatalogFallback.filter(isCatalogItemLaunched).map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getCatalogItemAdmin(slug);

  if (!item || !isCatalogItemLaunched(item)) {
    return { title: "Unknown catalog item" };
  }

  return {
    title: `${item.commonName} | Tompkins Field Guide`,
    description: item.summary,
  };
}

export default async function ItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [data, publishedItems] = await Promise.all([getItemPageDataAdmin(slug), getPublishedCatalogItemsAdmin()]);

  if (!data || !isCatalogItemLaunched(data.catalogItem)) {
    notFound();
  }

  const navItems = orderCatalogItems(publishedItems)
    .filter(isCatalogItemLaunched)
    .map((item) => ({
      slug: item.slug,
      commonName: item.commonName,
    }));

  return (
    <ItemPageChrome currentSlug={slug} items={navItems}>
      <ItemExperience data={data} />
    </ItemPageChrome>
  );
}
