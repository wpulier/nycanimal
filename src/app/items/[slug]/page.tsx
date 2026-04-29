/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { localCatalogFallback } from "@/lib/catalogFallback";
import { getCatalogItemAdmin } from "@/lib/catalogServer";
import type { CatalogItem } from "@/lib/catalogSchema";
import styles from "../../page.module.css";

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

function BigSticker({ item }: { item: CatalogItem }) {
  return (
    <div className={`${styles.bigSticker} ${item.stickerImageUrl ? styles.bigStickerImage : ""}`} style={{ transform: `rotate(${item.angle}deg)` }}>
      {item.stickerImageUrl ? <img src={item.stickerImageUrl} alt="" /> : <span>{item.sticker}</span>}
    </div>
  );
}

function PageModePanel({ item }: { item: CatalogItem }) {
  if (item.pageMode === "scroll-story") {
    return (
      <section className={`${styles.modePanel} ${styles.scrollStoryPanel}`}>
        <div className={styles.scrollTrack}>
          <span>street</span>
          <span>bench</span>
          <span>canopy</span>
          <span>sky</span>
        </div>
        <div>
          <h2>Watch pattern</h2>
          <p>{item.commonName} is best understood in motion: where it pauses, what it ignores, and how it uses human paths as habitat.</p>
        </div>
      </section>
    );
  }

  if (item.pageMode === "specimen") {
    return (
      <section className={`${styles.modePanel} ${styles.specimenPanel}`}>
        <div className={styles.specimenDiagram}>
          <i />
          <i />
          <i />
        </div>
        <div>
          <h2>Specimen view</h2>
          <p>Use the shape, texture, location, and seasonal signals together. This page mode is ready for labeled diagrams and annotated close-ups.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={`${styles.modePanel} ${styles.fieldCardPanel}`}>
      <div className={styles.fieldCardStamp}>FIELD CARD</div>
      <div>
        <h2>Quick ID</h2>
        <p>This compact mode is for fast recognition in the park: a few visual cues, a seasonal note, and a direct memory hook.</p>
      </div>
    </section>
  );
}

export default async function ItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = await getCatalogItemAdmin(slug);

  if (!item) {
    notFound();
  }

  return (
    <main className={styles.detailShell}>
      <Link className={styles.backLink} href="/">
        Back to stickers
      </Link>

      <article className={styles.detailCard} style={{ "--sticker-color": item.color } as React.CSSProperties}>
        <div className={styles.specimenBadge}>{item.kind}</div>
        <section className={styles.detailHero}>
          <BigSticker item={item} />
          <div>
            <p className={styles.eyebrow}>{item.pageMode}</p>
            <h1>{item.commonName}</h1>
            {item.latinName ? <p className={styles.latin}>{item.latinName}</p> : null}
            <p>{item.summary}</p>
          </div>
        </section>

        <PageModePanel item={item} />

        <section className={styles.detailGrid}>
          <div>
            <h2>Season signal</h2>
            <p>{item.seasonalNote}</p>
          </div>
          <div>
            <h2>Field notes</h2>
            <ul>
              {item.facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </div>
        </section>
      </article>
    </main>
  );
}
