/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { CSSProperties } from "react";
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
  if (item.geo) {
    return projectGeoToTompkinsMap(item.geo);
  }

  return {
    x: item.position.mapX * 10,
    y: item.position.mapY * 10,
  };
}

export function TompkinsMap({ items }: { items: CatalogItem[] }) {
  const { width, height } = tompkinsMapData.metadata.viewBox;
  const featuredElm = tompkinsMapData.trees.find((tree) => tree.id === "5103318");

  return (
    <section className={styles.mapBoard} aria-label="GIS-faithful Tompkins Square Park map">
      <svg className={styles.tompkinsSvg} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Tompkins Square Park boundary, paths, zones, landmarks, and tree canopy">
        <defs>
          <pattern id="map-paper-grid" width="42" height="42" patternUnits="userSpaceOnUse">
            <path d="M 42 0 L 0 0 0 42" fill="none" stroke="rgba(27, 33, 24, 0.08)" strokeWidth="2" />
          </pattern>
          <filter id="ink-wobble">
            <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" />
          </filter>
        </defs>

        <rect width={width} height={height} fill="#fff7dd" />
        <rect width={width} height={height} fill="url(#map-paper-grid)" />
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
      </svg>

      {items.map((item) => {
        const point = itemMapPoint(item);
        return (
          <Link
            className={styles.mapPin}
            href={`/items/${item.slug}`}
            key={item.slug}
            style={{
              "--x": `${(point.x / width) * 100}%`,
              "--y": `${(point.y / height) * 100}%`,
              "--sticker-color": item.color,
            } as CSSProperties}
          >
            {item.stickerImageUrl ? <img src={item.stickerImageUrl} alt="" /> : null}
            <span>{item.sticker}</span>
          </Link>
        );
      })}

      <div className={styles.mapCredit}>
        NYC Parks/Open Data + OpenStreetMap. Trees rendered from {tompkinsMapData.metadata.sourceCounts.activeTreesRendered} active park records.
      </div>
    </section>
  );
}
