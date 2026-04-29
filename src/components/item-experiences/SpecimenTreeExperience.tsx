/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import { mediaByRole, stickerImage } from "@/components/item-experiences/media";
import type { ItemPageData } from "@/lib/itemPageData";
import styles from "@/app/page.module.css";

export function SpecimenTreeExperience({ data }: { data: ItemPageData }) {
  const item = data.catalogItem;
  const sticker = stickerImage(data);
  const diagrams = [...mediaByRole(data, "diagram"), ...mediaByRole(data, "photo")].slice(0, 3);
  const notableTree = data.treePoints.find((tree) => item.treeRefs?.includes(tree.id)) ?? data.treePoints[0];

  return (
    <main className={`${styles.bespokeShell} ${styles.treeWorld}`} style={{ "--sticker-color": item.color } as CSSProperties}>
      <article className={styles.treeHero}>
        <div>
          <p className={styles.eyebrow}>specimen world</p>
          <h1>{item.commonName}</h1>
          {item.latinName ? <p className={styles.latin}>{item.latinName}</p> : null}
          <p>{item.summary}</p>
        </div>
        <div className={styles.treeDiagramCard}>
          {sticker ? <img src={sticker} alt="" /> : <span>{item.sticker}</span>}
          <i />
          <i />
          <i />
        </div>
      </article>

      <section className={styles.treeMetrics}>
        <article>
          <span>mapped trees</span>
          <strong>{data.treePoints.length || item.treeRefs?.length || 1}</strong>
        </article>
        <article>
          <span>notable tree</span>
          <strong>{notableTree?.id ?? item.treeRefs?.[0] ?? "curate next"}</strong>
        </article>
        <article>
          <span>condition</span>
          <strong>{notableTree?.condition ?? "seasonal check"}</strong>
        </article>
      </section>

      <section className={styles.experienceNotes}>
        {item.facts.map((fact, index) => (
          <article key={fact}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{fact}</p>
          </article>
        ))}
      </section>

      {diagrams.length ? (
        <section className={styles.experienceMediaStrip} aria-label={`${item.commonName} media`}>
          {diagrams.map((asset) => (
            <img key={asset.id} src={asset.downloadUrl} alt={asset.alt ?? ""} />
          ))}
        </section>
      ) : null}
    </main>
  );
}
