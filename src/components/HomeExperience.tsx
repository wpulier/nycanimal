/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getPublishedCatalogItemsClient } from "@/lib/catalogClient";
import type { CatalogItem } from "@/lib/catalogSchema";
import { getFirebaseAnalytics } from "@/lib/firebase";
import styles from "@/app/page.module.css";

export function HomeExperience({ initialItems }: { initialItems: CatalogItem[] }) {
  const [view, setView] = useState<"catalog" | "map">("catalog");
  const [items, setItems] = useState(initialItems);
  const sortedItems = useMemo(() => [...items].sort((a, b) => a.commonName.localeCompare(b.commonName)), [items]);

  useEffect(() => {
    void getFirebaseAnalytics();
    getPublishedCatalogItemsClient()
      .then(setItems)
      .catch(() => setItems(initialItems));
  }, [initialItems]);

  return (
    <main className={styles.shell}>
      <div className={styles.tabs} aria-label="View switcher">
        <button className={view === "catalog" ? styles.activeTab : ""} onClick={() => setView("catalog")} type="button">
          Catalog
        </button>
        <button className={view === "map" ? styles.activeTab : ""} onClick={() => setView("map")} type="button">
          Map
        </button>
      </div>

      {view === "catalog" ? (
        <section className={styles.stickerBoard} aria-label="Sticker catalog">
          {sortedItems.map((item) => (
            <Link
              className={styles.sticker}
              href={`/items/${item.slug}`}
              key={item.slug}
              style={{
                "--x": `${item.position.catalogX}%`,
                "--y": `${item.position.catalogY}%`,
                "--angle": `${item.angle}deg`,
                "--sticker-color": item.color,
              } as React.CSSProperties}
            >
              {item.stickerImageUrl ? <img src={item.stickerImageUrl} alt="" /> : null}
              <span>{item.sticker}</span>
              <small>{item.kind}</small>
            </Link>
          ))}
        </section>
      ) : (
        <section className={styles.mapBoard} aria-label="Tompkins map">
          <div className={styles.mapPathOne} />
          <div className={styles.mapPathTwo} />
          <div className={styles.mapLawn} />
          {sortedItems.map((item) => (
            <Link
              className={styles.mapPin}
              href={`/items/${item.slug}`}
              key={item.slug}
              style={{
                "--x": `${item.position.mapX}%`,
                "--y": `${item.position.mapY}%`,
                "--sticker-color": item.color,
              } as React.CSSProperties}
            >
              {item.stickerImageUrl ? <img src={item.stickerImageUrl} alt="" /> : null}
              <span>{item.sticker}</span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
