/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { CatalogItem } from "@/lib/catalogSchema";
import { isCatalogItemLaunched } from "@/lib/catalogLifecycle";
import { orderCatalogItems } from "@/lib/catalogOrder";
import styles from "@/app/page.module.css";

type StickerLayout = NonNullable<CatalogItem["stickerLayout"]>;

type StickerView = {
  item: CatalogItem;
  layout: StickerLayout;
  index: number;
};

type MapWarmupState = "idle" | "warming" | "ready" | "failed";

const INITIAL_EAGER_STICKER_COUNT = 4;
const HIGH_PRIORITY_STICKER_COUNT = 2;
const INITIAL_ANIMATED_STICKER_COUNT = 8;
const MAP_WARM_IDLE_TIMEOUT_MS = 250;
const curatedStickerLayouts: Record<string, StickerLayout> = {
  "rock-pigeon": { x: 34, y: 360, width: 226, rotate: -7, zIndex: 30, featured: true },
  "eastern-gray-squirrel": { x: 72, y: 338, width: 132, rotate: 9, zIndex: 24 },
  "house-sparrow": { x: 78, y: 590, width: 136, rotate: -8, zIndex: 18 },
  "american-elm": { x: 42, y: 650, width: 138, rotate: 10, zIndex: 17 },
  "london-plane": { x: 72, y: 835, width: 138, rotate: -12, zIndex: 13 },
  "cobblestone-edge": { x: 25, y: 850, width: 132, rotate: 5, zIndex: 14 },
};
const TompkinsMap = dynamic(() => import("@/components/TompkinsMap").then((module) => module.TompkinsMap), {
  ssr: false,
  loading: () => (
    <section className={styles.mapBoard} aria-label="Loading Tompkins Square Park map">
      <div className={styles.mapViewport}>
        <div className={styles.googleMapCanvas}>
          <div className={styles.googleMapLoading}>Loading map...</div>
        </div>
      </div>
    </section>
  ),
});

function preloadTompkinsMapInBackground() {
  void import("@/components/TompkinsMap").then((module) => module.preloadTompkinsMap());
}

function nextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function isInInitialViewport(element: HTMLElement) {
  const bounds = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

  return bounds.top < viewportHeight && bounds.bottom > 0 && bounds.left < viewportWidth && bounds.right > 0;
}

function waitForStickerImage(image: HTMLImageElement) {
  const decodeImage = () => {
    if (!image.decode) return Promise.resolve();
    return image.decode().then(() => undefined).catch(() => undefined);
  };

  if (image.complete) {
    return decodeImage();
  }

  return new Promise<void>((resolve) => {
    image.addEventListener("load", () => void decodeImage().then(resolve), { once: true });
    image.addEventListener("error", () => resolve(), { once: true });
  });
}

async function afterCriticalStickerImagesPaint(root: HTMLElement) {
  const criticalImages = Array.from(root.querySelectorAll('img[data-critical-sticker-image="true"]')).filter(
    (image): image is HTMLImageElement => image instanceof HTMLImageElement,
  );
  const visibleImages = Array.from(root.querySelectorAll("img")).filter(
    (image): image is HTMLImageElement => image instanceof HTMLImageElement && isInInitialViewport(image),
  );
  const images = criticalImages.length ? criticalImages : visibleImages;

  if (!images.length) {
    await nextFrame();
    return;
  }

  await Promise.all(images.map(waitForStickerImage));
  await nextFrame();
}

function hashSlug(slug: string) {
  return [...slug].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 7);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function fallbackStickerLayout(item: CatalogItem, fallbackIndex: number): StickerLayout {
  const hash = hashSlug(item.slug);
  const rowPatterns = [
    [50],
    [22, 75],
    [36, 68],
    [18, 51, 82],
    [29, 72],
  ];
  let row = 0;
  let remaining = fallbackIndex;

  while (remaining >= rowPatterns[row % rowPatterns.length].length) {
    remaining -= rowPatterns[row % rowPatterns.length].length;
    row += 1;
  }

  const columnCenters = rowPatterns[row % rowPatterns.length];
  const xJitter = ((hash % 17) - 8) * 0.72;
  const yJitter = (((hash >> 3) % 23) - 11) * 0.75;
  const widthByKind: Record<CatalogItem["kind"], number> = {
    bird: 132,
    plant: 118,
    tree: 112,
    mammal: 142,
    insect: 118,
    fungus: 116,
    object: 124,
  };

  return {
    x: clamp(columnCenters[remaining] + xJitter, 16, 84),
    y: 740 + row * 178 + yJitter,
    width: widthByKind[item.kind] + (hash % 15) - 7,
    rotate: ((hash % 29) - 14) * 0.82,
    zIndex: 2 + (hash % 8),
  };
}

function stickerLayoutForItem(item: CatalogItem, fallbackIndex: number) {
  const curatedLayout = curatedStickerLayouts[item.slug];

  if (curatedLayout) {
    return curatedLayout;
  }

  if (item.stickerImageUrl && item.stickerLayout) {
    return item.stickerLayout;
  }

  return fallbackStickerLayout(item, fallbackIndex);
}

function buildStickerViews(items: CatalogItem[]) {
  let fallbackIndex = 0;
  return orderCatalogItems(items).map((item, index): StickerView => {
    const hasCuratedLayout = Boolean(curatedStickerLayouts[item.slug]);
    const usesUploadedLayout = Boolean(!hasCuratedLayout && item.stickerImageUrl && item.stickerLayout);
    const layout = stickerLayoutForItem(item, fallbackIndex);

    if (!hasCuratedLayout && !usesUploadedLayout) {
      fallbackIndex += 1;
    }

    return { item, layout, index };
  });
}

function boardHeight(views: StickerView[]) {
  const tallestStickerBottom = views.reduce((max, view) => Math.max(max, view.layout.y + view.layout.width * 0.78), 0);
  return Math.max(1800, Math.ceil(tallestStickerBottom + 260));
}

function PlaceholderSticker({ item }: { item: CatalogItem }) {
  const isTreeLike = item.kind === "tree" || item.kind === "plant";
  const isAnimal = item.kind === "bird" || item.kind === "mammal";

  return (
    <svg className={styles.placeholderSticker} viewBox="0 0 120 120" aria-hidden="true">
      <path className={styles.placeholderBacking} d="M23 69C16 42 31 18 58 14c29-4 53 14 51 44-2 32-26 50-54 49-17-1-27-14-32-38Z" />
      {isTreeLike ? (
        <>
          <path className={styles.placeholderFill} d="M61 101C55 83 48 67 40 50c11 4 18 11 23 21 3-17 12-30 29-40-1 23-8 39-22 50 11-2 20 0 28 6-14 11-26 14-37 14Z" />
          <path className={styles.placeholderLine} d="M61 101C63 77 69 55 91 31M60 76c-8-11-15-19-20-26M65 70c12-1 23-3 33-8" />
        </>
      ) : isAnimal ? (
        <>
          <path className={styles.placeholderFill} d="M22 72c17-29 42-44 72-43 10 0 18 7 19 17 1 13-10 22-27 25L61 92c-17 9-35 1-39-20Z" />
          <path className={styles.placeholderLine} d="M50 79c17-18 31-29 54-33M79 41l17-13M38 83c7 7 14 10 23 9" />
          <circle className={styles.placeholderEye} cx="91" cy="45" r="4" />
        </>
      ) : (
        <>
          <path className={styles.placeholderFill} d="M38 96c-19-16-21-43-4-62 19-20 50-21 63 0 13 22 2 51-23 62-13 6-25 6-36 0Z" />
          <path className={styles.placeholderLine} d="M35 76c21-8 42-20 63-42M47 95c8-22 19-41 34-58" />
        </>
      )}
    </svg>
  );
}

function StickerContent({ item, index }: { item: CatalogItem; index: number }) {
  const launched = isCatalogItemLaunched(item);

  return (
    <>
      <span className={styles.stickerAsset}>
        {launched && item.stickerImageUrl ? (
          <img
            src={item.stickerImageUrl}
            alt=""
            data-critical-sticker-image={index < HIGH_PRIORITY_STICKER_COUNT ? "true" : undefined}
            decoding="async"
            fetchPriority={index < HIGH_PRIORITY_STICKER_COUNT ? "high" : "auto"}
            loading={index < INITIAL_EAGER_STICKER_COUNT ? "eager" : "lazy"}
          />
        ) : (
          <PlaceholderSticker item={item} />
        )}
      </span>
      <span className={styles.stickerId}>{item.sticker}</span>
      {!launched ? <span className={styles.stickerStatus}>Coming soon</span> : null}
    </>
  );
}

export function HomeExperience({ initialItems }: { initialItems: CatalogItem[] }) {
  const [view, setView] = useState<"catalog" | "map">("catalog");
  const [mapWarmupState, setMapWarmupState] = useState<MapWarmupState>("idle");
  const stickerPaperRef = useRef<HTMLDivElement>(null);
  const sortedItems = useMemo(() => [...initialItems].sort((a, b) => a.commonName.localeCompare(b.commonName)), [initialItems]);
  const stickerViews = useMemo(() => buildStickerViews(initialItems), [initialItems]);
  const paperHeight = useMemo(() => boardHeight(stickerViews), [stickerViews]);
  const isMapMounted = mapWarmupState !== "idle";
  const isMapClickable = mapWarmupState === "ready" || mapWarmupState === "failed";
  const isMapPending = !isMapClickable;

  const startMapWarmup = useCallback(() => {
    preloadTompkinsMapInBackground();
    setMapWarmupState((current) => (current === "idle" ? "warming" : current));
  }, []);

  useEffect(() => {
    const root = stickerPaperRef.current;

    if (!root) return;

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    let cancelled = false;
    let idleId: number | undefined;
    let timeoutId: number | undefined;

    const warmMap = () => {
      if (cancelled) return;
      startMapWarmup();
    };

    afterCriticalStickerImagesPaint(root).then(() => {
      if (cancelled) return;

      if (idleWindow.requestIdleCallback) {
        idleId = idleWindow.requestIdleCallback(warmMap, { timeout: MAP_WARM_IDLE_TIMEOUT_MS });
        return;
      }

      timeoutId = window.setTimeout(warmMap, 0);
    });

    return () => {
      cancelled = true;
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [startMapWarmup]);

  const showCatalog = () => {
    setView("catalog");
  };

  const showMap = () => {
    if (!isMapClickable) return;
    setView("map");
  };

  const handleMapReady = useCallback(() => {
    setMapWarmupState("ready");
  }, []);

  const handleMapError = useCallback(() => {
    setMapWarmupState("failed");
  }, []);

  return (
    <main className={styles.shell}>
      <div className={styles.tabs} aria-label="View switcher">
        <button className={view === "catalog" ? styles.activeTab : ""} onClick={showCatalog} type="button">
          Catalog
        </button>
        <button
          aria-busy={isMapPending ? "true" : undefined}
          aria-label={isMapPending ? "Map loading" : undefined}
          className={view === "map" ? styles.activeTab : ""}
          data-pending={isMapPending ? "true" : undefined}
          disabled={!isMapClickable}
          onClick={showMap}
          type="button"
        >
          Map
        </button>
      </div>

      <div className={styles.viewStack}>
        <section
          aria-hidden={view !== "catalog"}
          className={styles.viewLayer}
          data-active={view === "catalog"}
          data-view="catalog"
          inert={view !== "catalog" ? true : undefined}
        >
          <section className={styles.stickerBoard} aria-label="Catalog view">
            <div
              className={styles.stickerPaper}
              ref={stickerPaperRef}
              style={{ "--paper-height": `${paperHeight}px` } as CSSProperties}
            >
              <header className={styles.catalogHeader}>
                <h1>Tompkins Square Park</h1>
                <p className={styles.tapCue}>Tap a sticker</p>
              </header>

              <span className={styles.paperDoodle} aria-hidden="true" />

              {stickerViews.map(({ item, layout, index }) => {
                const launched = isCatalogItemLaunched(item);
                const stickerStyle = {
                  "--sticker-x": `${layout.x}%`,
                  "--sticker-y": `${layout.y}px`,
                  "--sticker-w": `${layout.width}px`,
                  "--angle": `${layout.rotate}deg`,
                  "--sticker-color": item.color,
                  "--z": layout.zIndex ?? index + 1,
                  "--delay": `${Math.min(index, 18) * 34}ms`,
                } as CSSProperties;
                const stickerProps = {
                  className: styles.sticker,
                  "data-featured": layout.featured ? "true" : undefined,
                  "data-has-asset": item.stickerImageUrl ? "true" : "false",
                  "data-launched": launched ? "true" : "false",
                  "data-enter": index < INITIAL_ANIMATED_STICKER_COUNT ? "true" : undefined,
                  style: stickerStyle,
                };

                return launched ? (
                  <Link aria-label={`Open ${item.commonName}`} href={`/items/${item.slug}`} key={item.slug} {...stickerProps}>
                    <StickerContent item={item} index={index} />
                  </Link>
                ) : (
                  <div aria-label={`${item.commonName} coming soon`} key={item.slug} {...stickerProps}>
                    <StickerContent item={item} index={index} />
                  </div>
                );
              })}
            </div>
          </section>
        </section>

        {isMapMounted ? (
          <section
            aria-hidden={view !== "map"}
            className={`${styles.viewLayer} ${styles.mapViewLayer}`}
            data-active={view === "map"}
            data-view="map"
          >
            <TompkinsMap items={sortedItems} onError={handleMapError} onReady={handleMapReady} />
          </section>
        ) : null}
      </div>
    </main>
  );
}
