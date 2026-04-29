"use client";

import maplibregl, { type LngLatBoundsLike, type Map as MapLibreMap, type StyleSpecification } from "maplibre-gl";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Feature, FeatureCollection, LineString, Point, Polygon } from "geojson";
import styles from "@/app/page.module.css";
import { tompkinsMapData } from "@/data/tompkinsMap";
import { catalogItemSlugForTreeSpecies } from "@/data/treeSpeciesCatalog";
import type { CatalogItem } from "@/lib/catalogSchema";
import { projectTompkinsMapToGeo } from "@/lib/tompkinsProjection";

type LngLatTuple = [number, number];

type ActiveMapCard = {
  id: string;
  kind: "tree" | "item";
  lngLat: LngLatTuple;
  kicker: string;
  title: string;
  subtitle?: string;
  details: Array<{ label: string; value: string }>;
  href?: string;
};

function lngLat(point: { lng: number; lat: number }): LngLatTuple {
  return [point.lng, point.lat];
}

function closeRing(points: readonly { lng: number; lat: number }[]) {
  const coordinates = points.map(lngLat);
  const first = coordinates[0];
  const last = coordinates[coordinates.length - 1];

  if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
    coordinates.push(first);
  }

  return coordinates;
}

function pointToLngLat(point: { x: number; y: number }) {
  const geo = projectTompkinsMapToGeo(point);
  return [geo.longitude, geo.latitude] as LngLatTuple;
}

function itemLngLat(item: CatalogItem): LngLatTuple {
  const coordinates = item.coordinates ?? item.geo;

  if (coordinates) {
    return [coordinates.longitude, coordinates.latitude];
  }

  return pointToLngLat({ x: item.position.mapX * 10, y: item.position.mapY * 10 });
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

function featureCollection<TGeometry extends Point | LineString | Polygon>(features: Array<Feature<TGeometry>>) {
  return { type: "FeatureCollection", features } satisfies FeatureCollection<TGeometry>;
}

function buildBounds(): LngLatBoundsLike {
  const bounds = new maplibregl.LngLatBounds();
  tompkinsMapData.boundary.forEach((point) => bounds.extend(lngLat(point)));
  return bounds;
}

function buildMaxBounds(): LngLatBoundsLike {
  const lngs = tompkinsMapData.boundary.map((point) => point.lng);
  const lats = tompkinsMapData.boundary.map((point) => point.lat);
  const padLng = 0.0014;
  const padLat = 0.0011;

  return [
    [Math.min(...lngs) - padLng, Math.min(...lats) - padLat],
    [Math.max(...lngs) + padLng, Math.max(...lats) + padLat],
  ];
}

function buildMapStyle(items: CatalogItem[]): StyleSpecification {
  const boundary = featureCollection<Polygon>([
    {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [closeRing(tompkinsMapData.boundary)] },
    },
  ]);

  const zones = featureCollection<Polygon>(
    tompkinsMapData.zones.map((zone) => ({
      type: "Feature",
      properties: { id: zone.id, name: zone.name, kind: zone.kind },
      geometry: { type: "Polygon", coordinates: [closeRing(zone.points)] },
    })),
  );

  const paths = featureCollection<LineString>(
    tompkinsMapData.paths.map((path) => ({
      type: "Feature",
      properties: { id: path.id, name: path.name, kind: path.kind },
      geometry: { type: "LineString", coordinates: path.points.map(lngLat) },
    })),
  );

  const trees = featureCollection<Point>(
    tompkinsMapData.trees.map((tree) => ({
      type: "Feature",
      properties: {
        id: tree.id,
        commonName: tree.commonName,
        latinName: tree.latinName ?? "",
        dbh: tree.dbh ?? 0,
        condition: tree.condition ?? "",
        color: treeColor(tree.commonName),
        radius: treeRadius(tree.dbh),
      },
      geometry: { type: "Point", coordinates: lngLat(tree.point) },
    })),
  );

  const itemPoints = featureCollection<Point>(
    items.map((item) => ({
      type: "Feature",
      properties: {
        slug: item.slug,
        commonName: item.commonName,
        latinName: item.latinName ?? "",
        kind: item.kind,
        color: item.color,
      },
      geometry: { type: "Point", coordinates: itemLngLat(item) },
    })),
  );

  const landmarks = featureCollection<Point>(
    tompkinsMapData.landmarks.map((landmark) => ({
      type: "Feature",
      properties: { id: landmark.id, name: landmark.name, kind: landmark.kind },
      geometry: { type: "Point", coordinates: lngLat(landmark.point) },
    })),
  );

  const streetLabels = featureCollection<Point>([
    { type: "Feature", properties: { label: "AVENUE A", rotate: -55 }, geometry: { type: "Point", coordinates: pointToLngLat({ x: 20, y: 785 }) } },
    { type: "Feature", properties: { label: "AVENUE B", rotate: -55 }, geometry: { type: "Point", coordinates: pointToLngLat({ x: 965, y: 420 }) } },
    { type: "Feature", properties: { label: "E 10 ST", rotate: 23 }, geometry: { type: "Point", coordinates: pointToLngLat({ x: 495, y: 35 }) } },
    { type: "Feature", properties: { label: "E 7 ST", rotate: 23 }, geometry: { type: "Point", coordinates: pointToLngLat({ x: 510, y: 1012 }) } },
  ]);

  return {
    version: 8,
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
    sources: {
      boundary: { type: "geojson", data: boundary },
      zones: { type: "geojson", data: zones },
      paths: { type: "geojson", data: paths },
      trees: { type: "geojson", data: trees },
      items: { type: "geojson", data: itemPoints },
      landmarks: { type: "geojson", data: landmarks },
      streetLabels: { type: "geojson", data: streetLabels },
    },
    layers: [
      { id: "paper", type: "background", paint: { "background-color": "#fff7dd" } },
      { id: "boundary-shadow", type: "fill", source: "boundary", paint: { "fill-color": "rgba(27, 33, 24, 0.16)", "fill-translate": [10, 12] } },
      { id: "boundary-fill", type: "fill", source: "boundary", paint: { "fill-color": "#b7d889" } },
      {
        id: "zones-fill",
        type: "fill",
        source: "zones",
        paint: {
          "fill-color": [
            "match",
            ["get", "kind"],
            "dog-run", "rgba(190, 160, 190, 0.78)",
            "playground", "rgba(242, 192, 120, 0.86)",
            "court", "rgba(216, 172, 97, 0.84)",
            "pool", "rgba(70, 187, 210, 0.82)",
            "garden", "rgba(137, 184, 98, 0.66)",
            "park-feature", "rgba(137, 184, 98, 0.66)",
            "rgba(255, 247, 221, 0.48)",
          ],
        },
      },
      { id: "zones-outline", type: "line", source: "zones", paint: { "line-color": "rgba(27, 33, 24, 0.42)", "line-width": 2.2 } },
      { id: "paths", type: "line", source: "paths", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "rgba(255, 250, 232, 0.9)", "line-width": ["interpolate", ["linear"], ["zoom"], 16, 7, 19, 16, 21, 26] } },
      { id: "boundary-outline", type: "line", source: "boundary", layout: { "line-join": "round" }, paint: { "line-color": "rgba(27, 33, 24, 0.9)", "line-width": ["interpolate", ["linear"], ["zoom"], 16, 2.5, 20, 7] } },
      { id: "trees", type: "circle", source: "trees", paint: { "circle-color": ["get", "color"], "circle-radius": ["interpolate", ["linear"], ["zoom"], 16, ["*", ["get", "radius"], 0.42], 20, ["get", "radius"], 21, ["*", ["get", "radius"], 1.35]], "circle-opacity": ["interpolate", ["linear"], ["zoom"], 16, 0.48, 19, 0.78], "circle-stroke-color": "rgba(255, 247, 221, 0.9)", "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 16, 0.8, 20, 2.2] } },
      { id: "landmarks", type: "circle", source: "landmarks", paint: { "circle-color": "#f35b2c", "circle-radius": ["interpolate", ["linear"], ["zoom"], 16, 3, 20, 8], "circle-stroke-color": "rgba(255, 247, 221, 0.95)", "circle-stroke-width": 2 } },
      { id: "tree-hit", type: "circle", source: "trees", paint: { "circle-color": "#000000", "circle-opacity": 0.01, "circle-radius": ["interpolate", ["linear"], ["zoom"], 16, 12, 20, 20, 21, 24] } },
      { id: "item-points", type: "circle", source: "items", paint: { "circle-color": ["get", "color"], "circle-radius": ["interpolate", ["linear"], ["zoom"], 16, 6, 19, 11, 21, 15], "circle-stroke-color": "rgba(27, 33, 24, 0.92)", "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 16, 2, 20, 4], "circle-translate": [0, 0], "circle-opacity": 0.94 } },
      {
        id: "street-labels",
        type: "symbol",
        source: "streetLabels",
        layout: {
          "text-field": ["get", "label"],
          "text-font": ["Open Sans Bold"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 16, 15, 20, 28],
          "text-rotate": ["get", "rotate"],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "rgba(27, 33, 24, 0.48)",
          "text-halo-color": "rgba(255, 247, 221, 0.86)",
          "text-halo-width": 2,
        },
      },
    ],
  };
}

function getCardScreenPoint(map: MapLibreMap | null, activeCard: ActiveMapCard | null) {
  if (!map || !activeCard) return null;
  return map.project(activeCard.lngLat);
}

export function TompkinsMap({ items }: { items: CatalogItem[] }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const activeCardRef = useRef<ActiveMapCard | null>(null);
  const [mapInstance, setMapInstance] = useState<MapLibreMap | null>(null);
  const [activeCard, setActiveCard] = useState<ActiveMapCard | null>(null);
  const [cameraTick, setCameraTick] = useState(0);
  const mapStyle = useMemo(() => buildMapStyle(items), [items]);
  const itemBySlug = useMemo(() => new Map(items.map((item) => [item.slug, item])), [items]);

  useEffect(() => {
    activeCardRef.current = activeCard;
  }, [activeCard]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    const map = new maplibregl.Map({
      container,
      style: mapStyle,
      bounds: buildBounds(),
      fitBoundsOptions: { padding: 84, duration: 0 },
      maxBounds: buildMaxBounds(),
      minZoom: 15.65,
      maxZoom: 21.4,
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      touchZoomRotate: true,
      doubleClickZoom: true,
      keyboard: true,
      clickTolerance: 6,
      fadeDuration: 120,
    });

    mapRef.current = map;
    setMapInstance(map);

    const syncActiveCard = () => {
      if (activeCardRef.current) setCameraTick((tick) => tick + 1);
    };

    map.on("move", syncActiveCard);
    map.on("zoom", syncActiveCard);
    map.on("resize", syncActiveCard);
    map.on("load", () => setCameraTick((tick) => tick + 1));
    map.on("click", (event) => {
      const features = map.queryRenderedFeatures(event.point, { layers: ["item-points", "tree-hit"] });
      const itemFeature = features.find((feature) => feature.layer.id === "item-points");
      const treeFeature = features.find((feature) => feature.layer.id === "tree-hit");

      if (itemFeature?.geometry.type === "Point") {
        const slug = String(itemFeature.properties.slug ?? "");
        const item = itemBySlug.get(slug);
        const coordinates = itemFeature.geometry.coordinates as LngLatTuple;

        if (item) {
          setActiveCard({
            id: slug,
            kind: "item",
            lngLat: coordinates,
            kicker: item.kind,
            title: item.commonName,
            subtitle: item.latinName,
            details: [{ label: "Card", value: item.pageMode.replace("-", " ") }],
            href: `/items/${item.slug}`,
          });
          return;
        }
      }

      if (treeFeature?.geometry.type === "Point") {
        const props = treeFeature.properties;
        const commonName = String(props.commonName ?? "Tree");
        const latinName = String(props.latinName ?? "");
        const treeId = String(props.id ?? "");
        const slug = catalogItemSlugForTreeSpecies(commonName, latinName || undefined, items);
        const coordinates = treeFeature.geometry.coordinates as LngLatTuple;
        const details = [
          props.dbh ? { label: "DBH", value: `${props.dbh} in` } : null,
          props.condition ? { label: "Condition", value: String(props.condition) } : null,
        ].filter((detail): detail is { label: string; value: string } => Boolean(detail));

        setActiveCard({
          id: treeId,
          kind: "tree",
          lngLat: coordinates,
          kicker: `Tree ${treeId}`,
          title: commonName,
          subtitle: latinName || undefined,
          details,
          href: `/items/${slug}`,
        });
        return;
      }

      setActiveCard(null);
    });

    for (const layerId of ["item-points", "tree-hit"]) {
      map.on("mouseenter", layerId, () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", layerId, () => {
        map.getCanvas().style.cursor = "";
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
  }, [itemBySlug, items, mapStyle]);

  const resetView = useCallback(() => {
    mapRef.current?.fitBounds(buildBounds(), { padding: 84, duration: 520, essential: true });
  }, []);

  const zoomBy = useCallback((delta: number) => {
    if (delta > 0) {
      mapRef.current?.zoomIn({ duration: 260, essential: true });
    } else {
      mapRef.current?.zoomOut({ duration: 260, essential: true });
    }
  }, []);

  // cameraTick forces a render during camera movement so the overlay stays anchored.
  void cameraTick;
  const activePoint = getCardScreenPoint(mapInstance, activeCard);

  return (
    <section className={styles.mapBoard} aria-label="GIS-faithful Tompkins Square Park map">
      <div className={styles.mapViewport}>
        <div className={styles.mapCanvas} ref={mapContainerRef} />

        {activeCard && activePoint ? (
          <div
            className={styles.treePopover}
            style={{
              left: activePoint.x,
              top: activePoint.y,
            } as CSSProperties}
          >
            <p className={styles.treePopoverKicker}>{activeCard.kicker}</p>
            <h3>{activeCard.title}</h3>
            {activeCard.subtitle ? <p className={styles.treePopoverLatin}>{activeCard.subtitle}</p> : null}
            {activeCard.details.length ? (
              <dl>
                {activeCard.details.map((detail) => (
                  <div className={styles.treePopoverRow} key={detail.label}>
                    <dt>{detail.label}</dt>
                    <dd>{detail.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            {activeCard.href ? <Link href={activeCard.href}>Open card</Link> : null}
          </div>
        ) : null}
      </div>

      <div className={styles.mapZoomControls} aria-label="Map zoom controls">
        <button type="button" onClick={() => zoomBy(1)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoomBy(-1)} aria-label="Zoom out">-</button>
        <button type="button" onClick={resetView}>Fit</button>
      </div>

      <div className={styles.mapCredit}>
        NYC Parks/Open Data + OpenStreetMap. Trees rendered from {tompkinsMapData.metadata.sourceCounts.activeTreesRendered} active park records.
      </div>
    </section>
  );
}
