import { notFound } from "next/navigation";
import { ItemExperience } from "@/components/item-experiences/registry";
import { localCatalogFallback } from "@/lib/catalogFallback";
import { getCatalogItemAdmin, getItemPageDataAdmin } from "@/lib/catalogServer";

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
  const data = await getItemPageDataAdmin(slug);

  if (!data) {
    notFound();
  }

  return <ItemExperience data={data} />;
}
