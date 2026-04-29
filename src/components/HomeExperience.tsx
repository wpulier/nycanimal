/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { CatalogItem } from "@/lib/catalogSchema";
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
  const row = Math.floor(fallbackIndex / 3);
  const col = fallbackIndex % 3;
  const columnCenters = row % 2 === 0 ? [22, 52, 78] : [29, 58, 82];
  const xJitter = ((hash % 13) - 6) * 0.85;
  const yJitter = (((hash >> 3) % 25) - 12) * 0.9;
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
    x: clamp(columnCenters[col] + xJitter, 18, 82),
    y: 1510 + row * 146 + yJitter,
    width: widthByKind[item.kind] + (hash % 19) - 9,
    rotate: ((hash % 31) - 15) * 0.9,
    zIndex: 2 + (hash % 8),
  };
}

function buildStickerViews(items: CatalogItem[]) {
  let fallbackIndex = 0;
  return orderCatalogItems(items).map((item, index): StickerView => {
    const layout = item.stickerLayout ?? fallbackStickerLayout(item, fallbackIndex++);
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

              {stickerViews.map(({ item, layout, index }) => (
                <Link
                  aria-label={`Open ${item.commonName}`}
                  className={styles.sticker}
                  data-featured={layout.featured ? "true" : undefined}
                  data-has-asset={item.stickerImageUrl ? "true" : "false"}
                  data-enter={index < INITIAL_ANIMATED_STICKER_COUNT ? "true" : undefined}
                  href={`/items/${item.slug}`}
                  key={item.slug}
                  style={{
                    "--sticker-x": `${layout.x}%`,
                    "--sticker-y": `${layout.y}px`,
                    "--sticker-w": `${layout.width}px`,
                    "--angle": `${layout.rotate}deg`,
                    "--sticker-color": item.color,
                    "--z": layout.zIndex ?? index + 1,
                    "--delay": `${Math.min(index, 18) * 34}ms`,
                  } as CSSProperties}
                >
                  <span className={styles.stickerAsset}>
                    {item.stickerImageUrl ? (
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
                </Link>
              ))}
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
