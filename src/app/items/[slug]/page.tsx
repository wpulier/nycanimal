import { notFound } from "next/navigation";
import { ItemPageChrome } from "@/components/ItemPageChrome";
import { ItemExperience } from "@/components/item-experiences/registry";
import { localCatalogFallback } from "@/lib/catalogFallback";
import { orderCatalogItems } from "@/lib/catalogOrder";
import { getCatalogItemAdmin, getItemPageDataAdmin, getPublishedCatalogItemsAdmin } from "@/lib/catalogServer";

export const revalidate = 60;

export function generateStaticParams() {
  return localCatalogFallback.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getCatalogItemAdmin(slug);

  if (!item) {
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

  if (!data) {
    notFound();
  }

  const navItems = orderCatalogItems(publishedItems).map((item) => ({
    slug: item.slug,
    commonName: item.commonName,
  }));

  return (
    <ItemPageChrome currentSlug={slug} items={navItems}>
      <ItemExperience data={data} />
    </ItemPageChrome>
  );
}
