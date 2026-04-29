import Link from "next/link";
import type { ReactNode } from "react";
import styles from "@/app/page.module.css";

export type ItemNavItem = {
  slug: string;
  commonName: string;
};

function nextItem(items: ItemNavItem[], currentSlug: string) {
  if (items.length < 2) return null;

  const currentIndex = items.findIndex((item) => item.slug === currentSlug);
  if (currentIndex === -1) return items[0] ?? null;

  return items[(currentIndex + 1) % items.length] ?? null;
}

function previousItem(items: ItemNavItem[], currentSlug: string) {
  if (items.length < 2) return null;

  const currentIndex = items.findIndex((item) => item.slug === currentSlug);
  if (currentIndex === -1) return items.at(-1) ?? null;

  return items[(currentIndex - 1 + items.length) % items.length] ?? null;
}

export function ItemPageChrome({
  children,
  currentSlug,
  items,
}: {
  children: ReactNode;
  currentSlug: string;
  items: ItemNavItem[];
}) {
  const previous = previousItem(items, currentSlug);
  const next = nextItem(items, currentSlug);

  return (
    <div className={styles.itemPageChrome}>
      <Link className={styles.itemBackControl} href="/">
        Back to stickers
      </Link>

      {children}

      {previous ? (
        <Link
          className={`${styles.itemStepControl} ${styles.itemStepControlLeft}`}
          href={`/items/${previous.slug}`}
          aria-label={`Previous sticker: ${previous.commonName}`}
        >
          <span aria-hidden="true">←</span>
        </Link>
      ) : null}

      {next ? (
        <Link
          className={`${styles.itemStepControl} ${styles.itemStepControlRight}`}
          href={`/items/${next.slug}`}
          aria-label={`Next sticker: ${next.commonName}`}
        >
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}
