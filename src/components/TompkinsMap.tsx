/* eslint-disable @next/next/no-img-element */
"use client";

import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import styles from "@/app/page.module.css";
import { tompkinsMapData } from "@/data/tompkinsMap";
import { catalogItemSlugForTreeSpecies } from "@/data/treeSpeciesCatalog";
import type { CatalogItem } from "@/lib/catalogSchema";
import { projectGeoToTompkinsMap } from "@/lib/tompkinsProjection";

function pointsToPath(points: readonly { x: number; y: number }[], close = false) {
  if (!points.length) return "";
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((point) => `L ${point.x} ${point.y}`).join(" ")}${close ? " Z" : ""}`;
}

function treeColor(commonName: string) {
  const lower = commonName.toLowerCase();
  if (lower.includes("elm")) return "#4f8d37";
  if (lower.includes("cherry") || lower.includes("apple")) return "#76c878";
  if (lower.includes("oak")) return "#315f25";
  if (lower.includes("honeylocust")) return "#7ea745";
  if (lower.includes("plane")) return "#5f7f32";
  if (lower.includes("unknown")) return "#9aa184";
  return "#2f9f45";
}

function treeRadius(dbh?: number) {
  if (!dbh) return 4.5;
  return Math.max(4.25, Math.min(14, 3.8 + dbh / 5));
}

function itemMapPoint(item: CatalogItem) {
  const coordinates = item.coordinates ?? item.geo;

  if (coordinates) {
    return projectGeoToTompkinsMap(coordinates);
  }

  return {
    x: item.position.mapX * 10,
    y: item.position.mapY * 10,
  };
}

function zoomLevel(scale: number) {
  if (scale >= 2.7) return "near";
  if (scale >= 1.45) return "mid";
  return "far";
}

export function TompkinsMap({ items }: { items: CatalogItem[] }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<ZoomBehavior<HTMLDivElement, unknown> | null>(null);
  const { width, height } = tompkinsMapData.metadata.viewBox;
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);
  const [activeTreeId, setActiveTreeId] = useState<string | null>(null);

  const initialTransform = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return zoomIdentity;
    const rect = viewport.getBoundingClientRect();
    const fitScale = Math.min(rect.width / width, rect.height / height) * 0.9;
    return zoomIdentity
      .translate((rect.width - width * fitScale) / 2, (rect.height - height * fitScale) / 2)
      .scale(fitScale);
  }, [height, width]);

  const applyTransform = useCallback((nextTransform: ZoomTransform) => {
    const viewport = viewportRef.current;
    const zoomBehavior = zoomRef.current;
    if (!viewport || !zoomBehavior) return;
    select(viewport).call(zoomBehavior.transform, nextTransform);
  }, []);

  const resetView = useCallback(() => applyTransform(initialTransform()), [applyTransform, initialTransform]);

  const zoomBy = useCallback((factor: number) => {
    const viewport = viewportRef.current;
    const zoomBehavior = zoomRef.current;
    if (!viewport || !zoomBehavior) return;
    select(viewport).call(zoomBehavior.scaleBy, factor);
  }, []);

  const itemPoints = useMemo(
    () => items.map((item) => ({ item, point: itemMapPoint(item) })),
    [items],
  );

  const activeTree = useMemo(
    () => tompkinsMapData.trees.find((tree) => tree.id === activeTreeId) ?? null,
    [activeTreeId],
  );

  const activeTreeSlug = activeTree
    ? catalogItemSlugForTreeSpecies(activeTree.commonName, activeTree.latinName, items)
    : null;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const zoomBehavior = zoom<HTMLDivElement, unknown>()
      .scaleExtent([0.55, 6])
      .translateExtent([
        [-width * 0.45, -height * 0.45],
        [width * 1.45, height * 1.45],
      ])
      .filter((event) => !(event.target instanceof Element && Boolean(event.target.closest("a,button"))))
      .wheelDelta((event) => -event.deltaY * (event.deltaMode === 1 ? 0.04 : 0.002))
      .on("zoom", (event) => setTransform(event.transform));

    zoomRef.current = zoomBehavior;
    select(viewport).call(zoomBehavior).call(zoomBehavior.transform, initialTransform());

    const resizeObserver = new ResizeObserver(() => {
      select(viewport).call(zoomBehavior.transform, initialTransform());
    });
    resizeObserver.observe(viewport);

    return () => {
      resizeObserver.disconnect();
      select(viewport).on(".zoom", null);
    };
  }, [height, initialTransform, width]);

  return (
    <section className={styles.mapBoard} aria-label="GIS-faithful Tompkins Square Park map">
      <div className={styles.mapViewport} data-zoom-level={zoomLevel(transform.k)} onClick={() => setActiveTreeId(null)} ref={viewportRef}>
        <svg className={styles.tompkinsSvg} role="img" aria-label="Tompkins Square Park boundary, paths, zones, landmarks, and tree canopy">
          <defs>
            <pattern id="map-paper-grid" width="42" height="42" patternUnits="userSpaceOnUse">
              <path d="M 42 0 L 0 0 0 42" fill="none" stroke="rgba(27, 33, 24, 0.08)" strokeWidth="2" />
            </pattern>
            <filter id="ink-wobble">
              <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" result="noise" />
              <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" />
            </filter>
          </defs>

          <rect className={styles.mapPaperFill} x="-5000" y="-5000" width="10000" height="10000" />
          <rect className={styles.mapPaperGrid} x="-5000" y="-5000" width="10000" height="10000" />
          <g transform={transform.toString()}>
            <path className={styles.mapBoundaryShadow} d={pointsToPath(tompkinsMapData.boundary, true)} />
            <path className={styles.mapBoundary} d={pointsToPath(tompkinsMapData.boundary, true)} />

            {tompkinsMapData.zones.map((zone) => (
              <path className={styles.mapZone} data-kind={zone.kind} d={pointsToPath(zone.points, true)} key={zone.id}>
                <title>{zone.name}</title>
              </path>
            ))}

            {tompkinsMapData.paths.map((path) => (
              <path className={styles.realMapPath} data-kind={path.kind} d={pointsToPath(path.points)} key={path.id}>
                <title>{path.name}</title>
              </path>
            ))}

            <g className={styles.treeCanopyLayer}>
              {tompkinsMapData.trees.map((tree) => (
                <g key={tree.id}>
                  <circle
                    className={styles.treeDot}
                    cx={tree.point.x}
                    cy={tree.point.y}
                    fill={treeColor(tree.commonName)}
                    r={treeRadius(tree.dbh)}
                  />
                  <circle
                    className={styles.treeHitArea}
                    cx={tree.point.x}
                    cy={tree.point.y}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveTreeId((current) => (current === tree.id ? null : tree.id));
                    }}
                    r={Math.max(treeRadius(tree.dbh), 18 / transform.k)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveTreeId(tree.id);
                      }
                    }}
                  >
                    <title>{`${tree.commonName}${tree.dbh ? `, ${tree.dbh} inch DBH` : ""} / Tree ${tree.id}`}</title>
                  </circle>
                </g>
              ))}
            </g>

            <g className={styles.mapLandmarks}>
              {tompkinsMapData.landmarks.map((landmark) => (
                <g data-kind={landmark.kind} key={landmark.id} transform={`translate(${landmark.point.x} ${landmark.point.y})`}>
                  <circle r="7" />
                  <text x="10" y="4">{landmark.name}</text>
                  <title>{landmark.name}</title>
                </g>
              ))}
            </g>

            <text className={styles.mapStreetLabel} x="20" y="785" transform="rotate(-55 20 785)">Avenue A</text>
            <text className={styles.mapStreetLabel} x="965" y="420" transform="rotate(-55 965 420)">Avenue B</text>
            <text className={styles.mapStreetLabel} x="495" y="35" transform="rotate(23 495 35)">E 10 St</text>
            <text className={styles.mapStreetLabel} x="510" y="1012" transform="rotate(23 510 1012)">E 7 St</text>
          </g>
        </svg>

        {itemPoints.map(({ item, point }) => (
          <Link
            aria-label={`Open ${item.commonName}`}
            className={styles.mapPin}
            href={`/items/${item.slug}`}
            key={item.slug}
            style={{
              left: transform.applyX(point.x),
              top: transform.applyY(point.y),
              "--sticker-color": item.color,
              "--pin-scale": Math.max(0.34, Math.min(0.72, 0.72 / Math.sqrt(transform.k))),
            } as CSSProperties}
            title={item.commonName}
          >
            {item.stickerImageUrl ? <img src={item.stickerImageUrl} alt="" /> : null}
            {!item.stickerImageUrl ? <span className={styles.mapPinDot} aria-hidden="true" /> : null}
          </Link>
        ))}

        {activeTree && activeTreeSlug ? (
          <div
            className={styles.treePopover}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            style={{
              left: transform.applyX(activeTree.point.x),
              top: transform.applyY(activeTree.point.y),
            }}
          >
            <p className={styles.treePopoverKicker}>Tree {activeTree.id}</p>
            <h3>{activeTree.commonName}</h3>
            {activeTree.latinName ? <p className={styles.treePopoverLatin}>{activeTree.latinName}</p> : null}
            <dl>
              {activeTree.dbh ? <><dt>DBH</dt><dd>{activeTree.dbh} in</dd></> : null}
              {activeTree.condition ? <><dt>Condition</dt><dd>{activeTree.condition}</dd></> : null}
            </dl>
            <Link href={`/items/${activeTreeSlug}`}>Open species card</Link>
          </div>
        ) : null}
      </div>

      <div className={styles.mapZoomControls} aria-label="Map zoom controls">
        <button type="button" onClick={() => zoomBy(1.55)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoomBy(0.65)} aria-label="Zoom out">-</button>
        <button type="button" onClick={resetView}>Fit</button>
      </div>

      <div className={styles.mapCredit}>
        NYC Parks/Open Data + OpenStreetMap. Trees rendered from {tompkinsMapData.metadata.sourceCounts.activeTreesRendered} active park records.
      </div>
    </section>
  );
}
