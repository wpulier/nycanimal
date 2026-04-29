/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import { mediaByRole, stickerImage } from "@/components/item-experiences/media";
import type { ItemPageData } from "@/lib/itemPageData";
import styles from "@/app/page.module.css";

export function RockPigeonExperience({ data }: { data: ItemPageData }) {
  const item = data.catalogItem;
  const sticker = stickerImage(data);
  const motionMedia = [...mediaByRole(data, "video"), ...mediaByRole(data, "gif")][0];
  const photos = mediaByRole(data, "photo").slice(0, 4);

  return (
    <main className={`${styles.bespokeShell} ${styles.pigeonWorld}`} style={{ "--sticker-color": item.color } as CSSProperties}>
      <article className={styles.pigeonHero}>
        <div className={styles.pigeonSkyline} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div>
          <p className={styles.eyebrow}>city bird motion study</p>
          <h1>{item.commonName}</h1>
          {item.latinName ? <p className={styles.latin}>{item.latinName}</p> : null}
          <p>{item.summary}</p>
        </div>
        {sticker ? <img className={styles.pigeonHeroSticker} src={sticker} alt="" /> : null}
      </article>

      <section className={styles.pigeonMotionGrid}>
        <div className={styles.pigeonTrackCard}>
          <span>crumb line</span>
          <span>bench orbit</span>
          <span>head bob</span>
          <span>lift off</span>
        </div>
        <div>
          <h2>Read the walk</h2>
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

      {photos.length ? (
        <section className={styles.experienceMediaStrip} aria-label="Pigeon media">
          {photos.map((asset) => (
            <img key={asset.id} src={asset.downloadUrl} alt={asset.alt ?? ""} />
          ))}
        </section>
      ) : null}
    </main>
  );
}
