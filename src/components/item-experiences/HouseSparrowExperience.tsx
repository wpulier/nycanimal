/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import { mediaByRole, stickerImage } from "@/components/item-experiences/media";
import type { ItemPageData } from "@/lib/itemPageData";
import styles from "@/app/page.module.css";

export function HouseSparrowExperience({ data }: { data: ItemPageData }) {
  const item = data.catalogItem;
  const sticker = stickerImage(data);
  const motionMedia = [...mediaByRole(data, "video"), ...mediaByRole(data, "gif")][0];

  return (
    <main className={`${styles.bespokeShell} ${styles.sparrowWorld}`} style={{ "--sticker-color": item.color } as CSSProperties}>
      <article className={styles.sparrowHero}>
        <div>
          <p className={styles.eyebrow}>micro movement</p>
          <h1>{item.commonName}</h1>
          {item.latinName ? <p className={styles.latin}>{item.latinName}</p> : null}
          <p>{item.summary}</p>
        </div>
        {sticker ? <img src={sticker} alt="" /> : null}
      </article>

      <section className={styles.sparrowStepStudy}>
        <div aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </div>
        <div>
          <h2>Why the hop?</h2>
          <p>{item.seasonalNote}</p>
          {motionMedia ? (
            <video className={styles.experienceMedia} src={motionMedia.downloadUrl} controls preload="metadata" playsInline />
          ) : null}
        </div>
      </section>

      <section className={styles.experienceNotes}>
        {item.facts.map((fact, index) => (
          <article key={fact}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <p>{fact}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
