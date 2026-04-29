/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { CSSProperties } from "react";
import { mediaByRole, stickerImage } from "@/components/item-experiences/media";
import type { ItemPageData } from "@/lib/itemPageData";
import styles from "@/app/page.module.css";

export function SquirrelExperience({ data }: { data: ItemPageData }) {
  const item = data.catalogItem;
  const sticker = stickerImage(data);
  const photos = mediaByRole(data, "photo").slice(0, 3);

  return (
    <main className={`${styles.bespokeShell} ${styles.squirrelWorld}`} style={{ "--sticker-color": item.color } as CSSProperties}>
      <Link className={styles.backLink} href="/">
        Back to stickers
      </Link>

      <article className={styles.squirrelCanopy}>
        <div>
          <p className={styles.eyebrow}>route behavior</p>
          <h1>{item.commonName}</h1>
          {item.latinName ? <p className={styles.latin}>{item.latinName}</p> : null}
          <p>{item.summary}</p>
        </div>
        <div className={styles.treeRoute} aria-hidden="true">
          <i />
          <i />
          <i />
          {sticker ? <img src={sticker} alt="" /> : null}
        </div>
      </article>

      <section className={styles.behaviorCards}>
        {item.facts.map((fact) => (
          <article key={fact}>
            <h2>{fact.split(" ").slice(0, 3).join(" ")}</h2>
            <p>{fact}</p>
          </article>
        ))}
      </section>

      {photos.length ? (
        <section className={styles.experienceMediaStrip} aria-label="Squirrel media">
          {photos.map((asset) => (
            <img key={asset.id} src={asset.downloadUrl} alt={asset.alt ?? ""} />
          ))}
        </section>
      ) : null}
    </main>
  );
}
