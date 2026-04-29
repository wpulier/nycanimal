/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { CSSProperties } from "react";
import { stickerImage } from "@/components/item-experiences/media";
import type { ItemPageData } from "@/lib/itemPageData";
import styles from "@/app/page.module.css";

function BigSticker({ data }: { data: ItemPageData }) {
  const item = data.catalogItem;
  const image = stickerImage(data);

  return (
    <div className={`${styles.bigSticker} ${image ? styles.bigStickerImage : ""}`} style={{ transform: `rotate(${item.angle}deg)` }}>
      {image ? <img src={image} alt="" /> : <span>{item.sticker}</span>}
    </div>
  );
}

function GenericModePanel({ data }: { data: ItemPageData }) {
  const item = data.catalogItem;

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
          <p>Use shape, texture, location, and seasonal signals together. This fallback is ready for diagrams and annotated close-ups.</p>
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

export function GenericSpeciesExperience({ data }: { data: ItemPageData }) {
  const item = data.catalogItem;

  return (
    <main className={styles.detailShell}>
      <Link className={styles.backLink} href="/">
        Back to stickers
      </Link>

      <article className={styles.detailCard} style={{ "--sticker-color": item.color } as CSSProperties}>
        <div className={styles.specimenBadge}>{item.kind}</div>
        <section className={styles.detailHero}>
          <BigSticker data={data} />
          <div>
            <p className={styles.eyebrow}>{item.experienceKey ? "custom-ready" : item.pageMode}</p>
            <h1>{item.commonName}</h1>
            {item.latinName ? <p className={styles.latin}>{item.latinName}</p> : null}
            <p>{item.summary}</p>
          </div>
        </section>

        <GenericModePanel data={data} />

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
