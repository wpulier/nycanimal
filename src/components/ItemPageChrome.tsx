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

export function ItemPageChrome({
  children,
  currentSlug,
  items,
}: {
  children: ReactNode;
  currentSlug: string;
  items: ItemNavItem[];
}) {
  const next = nextItem(items, currentSlug);

  return (
    <div className={styles.itemPageChrome}>
      <Link className={styles.itemBackControl} href="/">
        Back to stickers
      </Link>

      {children}

      {next ? (
        <Link className={styles.itemNextControl} href={`/items/${next.slug}`} aria-label={`Next sticker: ${next.commonName}`}>
          <span>Next</span>
          <span aria-hidden="true">→</span>
        </Link>
      ) : null}
    </div>
  );
}
