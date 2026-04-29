/* eslint-disable @next/next/no-img-element */
"use client";

import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from "d3-zoom";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import styles from "@/app/page.module.css";
import { tompkinsMapData } from "@/data/tompkinsMap";
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
  const featuredElm = tompkinsMapData.trees.find((tree) => tree.id === "5103318");
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity);

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
      <div className={styles.mapViewport} data-zoom-level={zoomLevel(transform.k)} ref={viewportRef}>
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
                <circle
                  cx={tree.point.x}
                  cy={tree.point.y}
                  fill={treeColor(tree.commonName)}
                  key={tree.id}
                  r={treeRadius(tree.dbh)}
                >
                  <title>{`${tree.commonName}${tree.dbh ? `, ${tree.dbh} inch DBH` : ""} / Tree ${tree.id}`}</title>
                </circle>
              ))}
            </g>

            {featuredElm ? (
              <g className={styles.featuredTreeMarker}>
                <circle cx={featuredElm.point.x} cy={featuredElm.point.y} r="22" />
                <text x={featuredElm.point.x + 25} y={featuredElm.point.y - 18}>Tree 5103318</text>
              </g>
            ) : null}

            <g className={styles.mapLandmarks}>
              {tompkinsMapData.landmarks.map((landmark) => (
                <g data-kind={landmark.kind} key={landmark.id} transform={`translate(${landmark.point.x} ${landmark.point.y})`}>
                  <circle r="7" />
                  <text x="10" y="4">{landmark.name}</text>
                  <title>{landmark.name}</title>
                </g>
              ))}
            </g>

            <text className={styles.mapStreetLabel} x="120" y="650" transform="rotate(-55 120 650)">Avenue A</text>
            <text className={styles.mapStreetLabel} x="840" y="350" transform="rotate(-55 840 350)">Avenue B</text>
            <text className={styles.mapStreetLabel} x="495" y="90" transform="rotate(23 495 90)">E 10 St</text>
            <text className={styles.mapStreetLabel} x="510" y="940" transform="rotate(23 510 940)">E 7 St</text>
            <text className={styles.mapTitleLabel} x="500" y="515">Tompkins Square Park</text>
          </g>
        </svg>

        {itemPoints.map(({ item, point }) => (
          <Link
            className={styles.mapPin}
            href={`/items/${item.slug}`}
            key={item.slug}
            style={{
              left: transform.applyX(point.x),
              top: transform.applyY(point.y),
              "--sticker-color": item.color,
              "--pin-scale": Math.max(0.58, Math.min(1.18, 1 / Math.sqrt(transform.k))),
            } as CSSProperties}
          >
            {item.stickerImageUrl ? <img src={item.stickerImageUrl} alt="" /> : null}
            <span>{item.sticker}</span>
          </Link>
        ))}
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
