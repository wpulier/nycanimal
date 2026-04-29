/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { CSSProperties } from "react";
import { firstMediaByRole, mediaByRole, stickerImage } from "@/components/item-experiences/media";
import type { ItemPageData } from "@/lib/itemPageData";
import { SquirrelModelStage } from "@/catalog/eastern-gray-squirrel/SquirrelModelStage";
import styles from "@/app/page.module.css";

export function SquirrelExperience({ data }: { data: ItemPageData }) {
  const item = data.catalogItem;
  const sticker = stickerImage(data);
  const model = firstMediaByRole(data, "model");
  const photos = mediaByRole(data, "photo").slice(0, 3);
  const treeRoutes = data.treePoints.slice(0, 4);

  if (!model) {
    throw new Error("eastern-gray-squirrel requires a published model media asset.");
  }

  return (
    <main className={`${styles.bespokeShell} ${styles.squirrelWorld}`} style={{ "--sticker-color": item.color } as CSSProperties}>
      <Link className={styles.backLink} href="/">
        Back to stickers
      </Link>

      <article className={styles.squirrelExperienceHero}>
        <div className={styles.squirrelStoryPanel}>
          <p className={styles.eyebrow}>canopy route study</p>
          <h1>{item.commonName}</h1>
          {item.latinName ? <p className={styles.latin}>{item.latinName}</p> : null}
          <p>{item.summary}</p>
        </div>

        <SquirrelModelStage modelUrl={model.downloadUrl} />
      </article>

      <section className={styles.squirrelRouteBoard} aria-label="Squirrel movement study">
        <div>
          <p className={styles.eyebrow}>route behavior</p>
          <h2>Fence to branch to cache.</h2>
        </div>
        <div className={styles.squirrelRouteSketch} aria-hidden="true">
          <i />
          <i />
          <i />
          {sticker ? <img src={sticker} alt="" /> : null}
        </div>
      </section>

      <section className={styles.behaviorCards}>
        {item.facts.map((fact) => (
          <article key={fact}>
            <h2>{fact.split(" ").slice(0, 3).join(" ")}</h2>
            <p>{fact}</p>
          </article>
        ))}
      </section>

      {treeRoutes.length ? (
        <section className={styles.squirrelTreeRefs} aria-label="Nearby tree context">
          <p className={styles.eyebrow}>nearby structure</p>
          {treeRoutes.map((tree) => (
            <article key={tree.id}>
              <span>{tree.commonName}</span>
              <small>{tree.condition ?? "park route"}</small>
            </article>
          ))}
        </section>
      ) : null}

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
