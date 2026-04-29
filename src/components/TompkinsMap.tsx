"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import styles from "@/app/page.module.css";
import { tompkinsMapData } from "@/data/tompkinsMap";
import type { CatalogItem } from "@/lib/catalogSchema";
import { hasGoogleMapsApiKey, publicEnv } from "@/lib/publicEnv";
import { projectTompkinsMapToGeo } from "@/lib/tompkinsProjection";

type GoogleMapPin = {
  slug: string;
  commonName: string;
  latinName?: string;
  kind: CatalogItem["kind"];
  color: string;
  label: string;
  imageUrl?: string;
  position: { lat: number; lng: number };
};

type GoogleMapsRoot = {
  importLibrary: (library: string) => Promise<Record<string, unknown>>;
};

type GoogleMapsWindow = Window & {
  google?: {
    maps?: GoogleMapsRoot;
  };
  __tompkinsGoogleMapsReady?: () => void;
};

type GoogleBounds = { north: number; south: number; east: number; west: number };
type GoogleMapMode = "top-down" | "oblique";

type GoogleMap3DElement = HTMLElement & {
  bounds?: GoogleBounds;
  cameraPosition?: { lat: number; lng: number; altitude?: number };
  center?: { lat: number; lng: number; altitude?: number };
  heading?: number;
  isSteady?: boolean;
  range?: number;
  tilt?: number;
  stopCameraAnimation?: () => void;
  flyCameraTo?: (options: {
    endCamera: {
      center: { lat: number; lng: number; altitude?: number };
      heading: number;
      range: number;
      tilt: number;
    };
    durationMillis: number;
  }) => void;
};

type GoogleMaps3DLibrary = {
  AltitudeMode?: Record<string, string>;
  AutofitsCameraAnimation?: Record<string, string>;
  GestureHandling?: Record<string, string>;
  MapMode?: Record<string, string>;
  Map3DElement: new (options: Record<string, unknown>) => GoogleMap3DElement;
  MarkerInteractiveElement?: new (options: Record<string, unknown>) => HTMLElement;
  Marker3DInteractiveElement?: new (options: Record<string, unknown>) => HTMLElement;
  Polygon3DElement?: new (options: Record<string, unknown>) => HTMLElement & {
    path?: Array<{ lat: number; lng: number; altitude?: number }>;
  };
  PopoverElement: new (options?: Record<string, unknown>) => HTMLElement & {
    open?: boolean;
    positionAnchor?: unknown;
    replaceChildren: (...nodes: Array<Node | string>) => void;
  };
};

type GoogleMarkerLibrary = {
  PinElement?: new (options: {
    background?: string;
    borderColor?: string;
    glyphColor?: string;
    glyphSrc?: string;
    glyphText?: string;
    scale?: number;
  }) => HTMLElement;
};

type GoogleCamera = {
  center: { lat: number; lng: number; altitude: number };
  heading: number;
  range: number;
  tilt: number;
};

type GoogleSteadyChangeEvent = Event & {
  detail?: {
    isSteady?: boolean;
  };
  isSteady?: boolean;
};

type TompkinsMapProps = {
  items: CatalogItem[];
  onError?: () => void;
  onReady?: () => void;
};

const GOOGLE_MAPS_VERSION = "weekly";
const TOMPKINS_CENTER = buildTompkinsCenter();
const TOMPKINS_CAMERA: GoogleCamera = {
  center: TOMPKINS_CENTER,
  heading: 0,
  range: 480,
  tilt: 0,
};
const TOMPKINS_OBLIQUE_CAMERA: GoogleCamera = {
  center: TOMPKINS_CENTER,
  heading: TOMPKINS_CAMERA.heading,
  range: 420,
  tilt: 32,
};
const TOMPKINS_CONTEXT_PAD_LNG = 0.00062;
const TOMPKINS_CONTEXT_PAD_LAT = 0.0005;
const TOMPKINS_MIN_ALTITUDE = 180;
const TOMPKINS_MAX_ALTITUDE = 680;
const TOMPKINS_TOP_DOWN_MIN_RANGE = 330;
const TOMPKINS_TOP_DOWN_MAX_RANGE = 620;
const TOMPKINS_OBLIQUE_MIN_RANGE = 250;
const TOMPKINS_OBLIQUE_MAX_RANGE = 560;
const TOMPKINS_OBLIQUE_CAMERA_MARGIN_METERS = 80;
const GOOGLE_ZOOMED_OUT_PIN_SCALE = 0.5;
const GOOGLE_ZOOMED_OUT_RANGE_DELTA = 24;
const DEFAULT_GOOGLE_PIN_SLUGS = new Set([
  "rock-pigeon",
  "eastern-gray-squirrel",
  "house-sparrow",
  "american-elm",
  "london-plane",
  "cobblestone-edge",
]);
let googleMapsLoadPromise: Promise<GoogleMapsRoot> | null = null;
let google3DLoadPromise: Promise<{ maps3d: GoogleMaps3DLibrary; marker: GoogleMarkerLibrary }> | null = null;

function buildTompkinsCenter() {
  const points = tompkinsMapData.boundary;
  let area = 0;
  let lng = 0;
  let lat = 0;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const nextPoint = points[(index + 1) % points.length];
    const cross = point.lng * nextPoint.lat - nextPoint.lng * point.lat;

    area += cross;
    lng += (point.lng + nextPoint.lng) * cross;
    lat += (point.lat + nextPoint.lat) * cross;
  }

  area *= 0.5;
  if (Math.abs(area) < Number.EPSILON) {
    const lngs = points.map((point) => point.lng);
    const lats = points.map((point) => point.lat);

    return {
      lat: (Math.min(...lats) + Math.max(...lats)) / 2,
      lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      altitude: 0,
    };
  }

  return {
    lat: lat / (6 * area),
    lng: lng / (6 * area),
    altitude: 0,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function degreesToRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function metersToLatitudeDegrees(meters: number) {
  return meters / 111_320;
}

function metersToLongitudeDegrees(meters: number, latitude: number) {
  const latitudeScale = Math.max(Math.cos(degreesToRadians(latitude)), 0.01);
  return meters / (111_320 * latitudeScale);
}

function pointToLngLat(point: { x: number; y: number }) {
  const geo = projectTompkinsMapToGeo(point);
  return { lat: geo.latitude, lng: geo.longitude };
}

function itemLngLat(item: CatalogItem) {
  const coordinates = item.coordinates ?? item.geo;

  if (coordinates) {
    return { lat: coordinates.latitude, lng: coordinates.longitude };
  }

  return pointToLngLat({ x: item.position.mapX * 10, y: item.position.mapY * 10 });
}

function isVisibleGoogleMapItem(item: CatalogItem) {
  return item.mapPin?.enabled ?? DEFAULT_GOOGLE_PIN_SLUGS.has(item.slug);
}

function googleMapPinFromItem(item: CatalogItem): GoogleMapPin | null {
  if (!isVisibleGoogleMapItem(item)) return null;

  return {
    slug: item.slug,
    commonName: item.commonName,
    latinName: item.latinName,
    kind: item.kind,
    color: item.color,
    label: item.mapPin?.label ?? item.sticker,
    imageUrl: item.mapPin?.imageUrl ?? item.stickerImageUrl,
    position: itemLngLat(item),
  };
}

function buildGoogleMapPins(items: CatalogItem[]) {
  return items.map(googleMapPinFromItem).filter((pin): pin is GoogleMapPin => Boolean(pin));
}

function buildTompkinsBaseBounds(): GoogleBounds {
  const lngs = tompkinsMapData.boundary.map((point) => point.lng);
  const lats = tompkinsMapData.boundary.map((point) => point.lat);

  return {
    north: Math.max(...lats) + TOMPKINS_CONTEXT_PAD_LAT,
    south: Math.min(...lats) - TOMPKINS_CONTEXT_PAD_LAT,
    east: Math.max(...lngs) + TOMPKINS_CONTEXT_PAD_LNG,
    west: Math.min(...lngs) - TOMPKINS_CONTEXT_PAD_LNG,
  };
}

function buildTompkinsGoogleBounds(mode: GoogleMapMode): GoogleBounds {
  const bounds = buildTompkinsBaseBounds();

  if (mode === "top-down") {
    return bounds;
  }

  const maxTiltedCameraOffset =
    TOMPKINS_OBLIQUE_MAX_RANGE * Math.sin(degreesToRadians(TOMPKINS_OBLIQUE_CAMERA.tilt)) +
    TOMPKINS_OBLIQUE_CAMERA_MARGIN_METERS;

  return {
    ...bounds,
    south: Math.min(bounds.south, TOMPKINS_CENTER.lat - metersToLatitudeDegrees(maxTiltedCameraOffset)),
    west: bounds.west - metersToLongitudeDegrees(TOMPKINS_OBLIQUE_CAMERA_MARGIN_METERS, TOMPKINS_CENTER.lat),
    east: bounds.east + metersToLongitudeDegrees(TOMPKINS_OBLIQUE_CAMERA_MARGIN_METERS, TOMPKINS_CENTER.lat),
  };
}

function loadGoogleMaps(apiKey: string) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }

  const googleWindow = window as GoogleMapsWindow;
  if (googleWindow.google?.maps?.importLibrary) {
    return Promise.resolve(googleWindow.google.maps);
  }

  googleMapsLoadPromise ??= new Promise<GoogleMapsRoot>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>("script[data-tompkins-google-maps]");
    const finish = () => {
      const maps = googleWindow.google?.maps;
      if (maps?.importLibrary) {
        resolve(maps);
      } else {
        reject(new Error("Google Maps loaded without importLibrary."));
      }
    };

    googleWindow.__tompkinsGoogleMapsReady = finish;

    if (existingScript) {
      existingScript.addEventListener("load", finish, { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Google Maps failed to load.")), { once: true });
      return;
    }

    const params = new URLSearchParams({
      key: apiKey,
      v: GOOGLE_MAPS_VERSION,
      libraries: "maps3d,marker",
      callback: "__tompkinsGoogleMapsReady",
      loading: "async",
    });
    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.dataset.tompkinsGoogleMaps = "true";
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.onerror = () => reject(new Error("Google Maps failed to load."));
    document.head.append(script);
  });

  return googleMapsLoadPromise;
}

function loadGoogle3DLibraries(apiKey: string) {
  google3DLoadPromise ??= loadGoogleMaps(apiKey).then(async (maps) => {
    const [maps3d, marker] = await Promise.all([
      maps.importLibrary("maps3d") as Promise<GoogleMaps3DLibrary>,
      maps.importLibrary("marker") as Promise<GoogleMarkerLibrary>,
    ]);

    if (!maps3d.Map3DElement || !(maps3d.MarkerInteractiveElement || maps3d.Marker3DInteractiveElement) || !maps3d.PopoverElement) {
      throw new Error("Google Maps 3D library is unavailable for this key/project.");
    }

    return { maps3d, marker };
  });

  return google3DLoadPromise;
}

export function preloadTompkinsMap() {
  if (!hasGoogleMapsApiKey()) return;
  void loadGoogle3DLibraries(publicEnv.googleMapsApiKey).catch(() => {
    google3DLoadPromise = null;
  });
}

function rangeBoundsForMode(mode: GoogleMapMode) {
  if (mode === "oblique") {
    return { min: TOMPKINS_OBLIQUE_MIN_RANGE, max: TOMPKINS_OBLIQUE_MAX_RANGE };
  }

  return { min: TOMPKINS_TOP_DOWN_MIN_RANGE, max: TOMPKINS_TOP_DOWN_MAX_RANGE };
}

function cameraForMode(mode: GoogleMapMode, range?: number): GoogleCamera {
  const camera = mode === "oblique" ? TOMPKINS_OBLIQUE_CAMERA : TOMPKINS_CAMERA;
  const rangeBounds = rangeBoundsForMode(mode);

  return {
    ...camera,
    center: TOMPKINS_CENTER,
    range: clamp(range ?? camera.range, rangeBounds.min, rangeBounds.max),
  };
}

function syncGooglePinScale(map: GoogleMap3DElement) {
  const range = typeof map.range === "number" ? map.range : TOMPKINS_CAMERA.range;
  const scale = range > TOMPKINS_CAMERA.range + GOOGLE_ZOOMED_OUT_RANGE_DELTA ? GOOGLE_ZOOMED_OUT_PIN_SCALE : 1;
  map.style.setProperty("--google-pin-scale", scale.toString());
}

function writeGoogleCamera(map: GoogleMap3DElement, camera: GoogleCamera) {
  map.stopCameraAnimation?.();
  map.center = camera.center;
  map.heading = camera.heading;
  map.range = camera.range;
  map.tilt = camera.tilt;
  syncGooglePinScale(map);
}

function setGoogleCamera(map: GoogleMap3DElement, camera: GoogleCamera, durationMillis = 0) {
  map.stopCameraAnimation?.();

  if (durationMillis > 0 && map.flyCameraTo) {
    map.flyCameraTo({ endCamera: camera, durationMillis });
    return;
  }

  writeGoogleCamera(map, camera);
}

function setGoogleMapMode(map: GoogleMap3DElement, mode: GoogleMapMode, range?: number) {
  if (mode === "oblique") {
    map.bounds = buildTompkinsGoogleBounds("oblique");
    setGoogleCamera(map, cameraForMode("oblique", range));
    return;
  }

  setGoogleCamera(map, cameraForMode("top-down", range));
  map.bounds = buildTompkinsGoogleBounds("top-down");
}

function normalizeWheelDelta(event: WheelEvent) {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * window.innerHeight;
  }

  return event.deltaY;
}

function touchDistance(firstTouch: Touch, secondTouch: Touch) {
  return Math.hypot(firstTouch.clientX - secondTouch.clientX, firstTouch.clientY - secondTouch.clientY);
}

function attachGoogleCameraZoom(map: GoogleMap3DElement, modeRef: MutableRefObject<GoogleMapMode>) {
  let queuedFrame: number | undefined;
  let queuedRange: number | undefined;
  let pinchStartDistance = 0;
  let pinchStartRange = 0;

  const currentMode = () => modeRef.current;
  const currentRange = () => queuedRange ?? map.range ?? cameraForMode(currentMode()).range;

  const queueRangeWrite = (range: number) => {
    queuedRange = range;

    if (queuedFrame !== undefined) {
      return;
    }

    queuedFrame = window.requestAnimationFrame(() => {
      const mode = currentMode();
      const rangeToWrite = queuedRange;

      queuedFrame = undefined;
      queuedRange = undefined;

      if (rangeToWrite === undefined) return;
      writeGoogleCamera(map, cameraForMode(mode, rangeToWrite));
    });
  };

  const zoomByRangeFactor = (factor: number) => {
    const mode = currentMode();
    const rangeBounds = rangeBoundsForMode(mode);
    queueRangeWrite(clamp(currentRange() * factor, rangeBounds.min, rangeBounds.max));
  };

  const handleWheel = (event: WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    zoomByRangeFactor(Math.exp(normalizeWheelDelta(event) * 0.00125));
  };

  const handleTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 2) return;

    event.preventDefault();
    event.stopPropagation();
    pinchStartDistance = touchDistance(event.touches[0], event.touches[1]);
    pinchStartRange = currentRange();
  };

  const handleTouchMove = (event: TouchEvent) => {
    if (event.touches.length !== 2 || pinchStartDistance <= 0) return;

    event.preventDefault();
    event.stopPropagation();
    const nextDistance = Math.max(touchDistance(event.touches[0], event.touches[1]), 1);
    const mode = currentMode();
    const rangeBounds = rangeBoundsForMode(mode);

    queueRangeWrite(clamp(pinchStartRange * (pinchStartDistance / nextDistance), rangeBounds.min, rangeBounds.max));
  };

  const handleTouchEnd = () => {
    if (pinchStartDistance <= 0) return;
    pinchStartDistance = 0;
    pinchStartRange = 0;
  };

  map.addEventListener("wheel", handleWheel, { capture: true, passive: false });
  map.addEventListener("touchstart", handleTouchStart, { capture: true, passive: false });
  map.addEventListener("touchmove", handleTouchMove, { capture: true, passive: false });
  map.addEventListener("touchend", handleTouchEnd, { capture: true });
  map.addEventListener("touchcancel", handleTouchEnd, { capture: true });

  return () => {
    if (queuedFrame !== undefined) window.cancelAnimationFrame(queuedFrame);
    map.removeEventListener("wheel", handleWheel, { capture: true });
    map.removeEventListener("touchstart", handleTouchStart, { capture: true });
    map.removeEventListener("touchmove", handleTouchMove, { capture: true });
    map.removeEventListener("touchend", handleTouchEnd, { capture: true });
    map.removeEventListener("touchcancel", handleTouchEnd, { capture: true });
  };
}

function attachGooglePinScaling(map: GoogleMap3DElement) {
  const sync = () => syncGooglePinScale(map);
  map.addEventListener("gmp-rangechange", sync);
  sync();

  return () => {
    map.removeEventListener("gmp-rangechange", sync);
  };
}

function googlePinLabel(pin: GoogleMapPin) {
  const label = pin.label.trim();
  if (label.length <= 3) return label.toUpperCase();

  const initials = label
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return initials || label.slice(0, 2).toUpperCase();
}

function createGooglePinNode(pin: GoogleMapPin) {
  const element = document.createElement("span");
  element.className = styles.google3dPin;
  element.style.backgroundColor = pin.color;
  element.style.setProperty("--pin-color", pin.color);

  if (pin.imageUrl) {
    const image = document.createElement("img");
    image.alt = "";
    image.src = pin.imageUrl;
    element.append(image);
  } else {
    element.textContent = googlePinLabel(pin);
  }

  return element;
}

function createGooglePinElement(marker: GoogleMarkerLibrary, pin: GoogleMapPin) {
  if (!marker.PinElement) return null;

  return new marker.PinElement({
    background: pin.color,
    borderColor: "#fff7dd",
    glyphColor: "#1b2118",
    scale: 1.18,
    ...(pin.imageUrl ? { glyphSrc: pin.imageUrl } : { glyphText: googlePinLabel(pin) }),
  });
}

function buildGooglePopoverContent(pin: GoogleMapPin) {
  const wrapper = document.createElement("div");
  const kicker = document.createElement("p");
  const title = document.createElement("h3");
  const link = document.createElement("a");

  wrapper.className = styles.google3dPopover;
  kicker.className = styles.treePopoverKicker;
  kicker.textContent = pin.kind;
  title.textContent = pin.commonName;
  link.href = `/items/${pin.slug}`;
  link.textContent = "Open card";
  wrapper.append(kicker, title);

  if (pin.latinName) {
    const latin = document.createElement("p");
    latin.className = styles.treePopoverLatin;
    latin.textContent = pin.latinName;
    wrapper.append(latin);
  }

  wrapper.append(link);
  return wrapper;
}

function appendGoogleBoundary(map: GoogleMap3DElement, maps3d: GoogleMaps3DLibrary) {
  if (!maps3d.Polygon3DElement) return;

  const boundary = new maps3d.Polygon3DElement({
    altitudeMode: maps3d.AltitudeMode?.CLAMP_TO_GROUND ?? "CLAMP_TO_GROUND",
    drawsOccludedSegments: true,
    fillColor: "#fff7dd00",
    strokeColor: "#fff7ddcc",
    strokeWidth: 4,
  });
  boundary.path = tompkinsMapData.boundary.map((point) => ({
    lat: point.lat,
    lng: point.lng,
    altitude: 4,
  }));
  map.append(boundary);
}

function waitForNextPaint(callback: () => void) {
  return window.requestAnimationFrame(callback);
}

function GoogleMapUnavailable({ reason }: { reason: "missing-key" | "load-error" }) {
  return (
    <section className={styles.mapBoard} aria-label="Google 3D Tompkins Square Park map">
      <div className={styles.mapViewport}>
        <div className={styles.googleMapCanvas}>
          <div className={styles.googleMapUnavailable}>
            <h2>Google 3D map is not loaded</h2>
            <p>
              {reason === "missing-key"
                ? "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing from this build."
                : "Google Maps 3D failed to initialize for this key/project."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function GoogleTompkinsMap({ apiKey, items, onError, onReady }: TompkinsMapProps & { apiKey: string }) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMap3DElement | null>(null);
  const mapModeRef = useRef<GoogleMapMode>("top-down");
  const onErrorRef = useRef(onError);
  const onReadyRef = useRef(onReady);
  const [loadFailed, setLoadFailed] = useState(false);
  const [isObliqueView, setIsObliqueView] = useState(false);
  const mapPins = useMemo(() => buildGoogleMapPins(items), [items]);

  useEffect(() => {
    onErrorRef.current = onError;
    onReadyRef.current = onReady;
  }, [onError, onReady]);

  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    let cancelled = false;
    let failed = false;
    let ready = false;
    let sceneBuilt = false;
    let steadyBeforeSceneBuilt = false;
    let detachCameraZoom: (() => void) | undefined;
    let detachPinScaling: (() => void) | undefined;
    let detachSteadyListener: (() => void) | undefined;
    let detachMapErrorListener: (() => void) | undefined;
    let readyFrameId: number | undefined;

    const failMapLoad = () => {
      if (cancelled || failed) return;
      failed = true;
      setLoadFailed(true);
      onErrorRef.current?.();
    };

    const markMapReady = () => {
      if (cancelled || failed || ready) return;

      if (!sceneBuilt) {
        steadyBeforeSceneBuilt = true;
        return;
      }

      ready = true;
      readyFrameId = waitForNextPaint(() => {
        if (!cancelled) onReadyRef.current?.();
      });
    };

    container.replaceChildren();
    setLoadFailed(false);

    loadGoogle3DLibraries(apiKey)
      .then(({ maps3d, marker }) => {
        if (cancelled) return;

        const initialMode = mapModeRef.current;
        const initialCamera = cameraForMode(initialMode);
        const map = new maps3d.Map3DElement({
          autofitsCameraAnimation: maps3d.AutofitsCameraAnimation?.NONE ?? "NONE",
          bounds: buildTompkinsGoogleBounds(initialMode),
          center: initialCamera.center,
          defaultUIHidden: true,
          description: "Photorealistic 3D map of Tompkins Square Park",
          fov: 38,
          gestureHandling: maps3d.GestureHandling?.GREEDY ?? "GREEDY",
          heading: initialCamera.heading,
          maxAltitude: TOMPKINS_MAX_ALTITUDE,
          maxHeading: TOMPKINS_CAMERA.heading,
          maxTilt: TOMPKINS_OBLIQUE_CAMERA.tilt,
          minAltitude: TOMPKINS_MIN_ALTITUDE,
          minHeading: TOMPKINS_CAMERA.heading,
          minTilt: TOMPKINS_CAMERA.tilt,
          mode: maps3d.MapMode?.SATELLITE ?? "SATELLITE",
          range: initialCamera.range,
          tilt: initialCamera.tilt,
        });
        const handleMapError = () => failMapLoad();
        const handleSteadyChange = (event: Event) => {
          const steadyEvent = event as GoogleSteadyChangeEvent;
          if (steadyEvent.isSteady === true || steadyEvent.detail?.isSteady === true) {
            markMapReady();
          }
        };

        map.addEventListener("gmp-error", handleMapError);
        map.addEventListener("gmp-steadychange", handleSteadyChange);
        detachMapErrorListener = () => map.removeEventListener("gmp-error", handleMapError);
        detachSteadyListener = () => map.removeEventListener("gmp-steadychange", handleSteadyChange);
        map.className = styles.googleMapElement;
        mapRef.current = map;
        container.append(map);
        detachCameraZoom = attachGoogleCameraZoom(map, mapModeRef);
        detachPinScaling = attachGooglePinScaling(map);
        appendGoogleBoundary(map, maps3d);

        const popover = new maps3d.PopoverElement({
          lightDismissDisabled: false,
          open: false,
        });
        map.append(popover);

        const MarkerClass = maps3d.MarkerInteractiveElement ?? maps3d.Marker3DInteractiveElement;
        const supportsHtmlMarkers = Boolean(maps3d.MarkerInteractiveElement);
        if (!MarkerClass) {
          throw new Error("Google Maps 3D marker library is unavailable.");
        }

        for (const pin of mapPins) {
          const interactiveMarker = new MarkerClass({
            altitudeMode: maps3d.AltitudeMode?.CLAMP_TO_GROUND ?? "CLAMP_TO_GROUND",
            ...(supportsHtmlMarkers
              ? {
                  anchorLeft: "-50%",
                  anchorTop: "-50%",
                  collisionPriority: 1000,
                }
              : {
                  label: googlePinLabel(pin),
                  sizePreserved: true,
            }),
            position: { ...pin.position, altitude: supportsHtmlMarkers ? 8 : 24 },
            title: pin.commonName,
          });
          (interactiveMarker as HTMLElement & { sizePreserved?: boolean }).sizePreserved = false;

          if (supportsHtmlMarkers) {
            interactiveMarker.append(createGooglePinNode(pin));
          } else {
            const fallbackPin = createGooglePinElement(marker, pin);
            if (fallbackPin) interactiveMarker.append(fallbackPin);
          }

          interactiveMarker.addEventListener("gmp-click", () => {
            popover.open = false;
            popover.positionAnchor = interactiveMarker;
            popover.replaceChildren(buildGooglePopoverContent(pin));
            popover.open = true;
          });
          map.append(interactiveMarker);
        }

        sceneBuilt = true;
        if (steadyBeforeSceneBuilt || map.isSteady === true) {
          markMapReady();
        }
      })
      .catch(failMapLoad);

    return () => {
      cancelled = true;
      if (readyFrameId !== undefined) window.cancelAnimationFrame(readyFrameId);
      detachCameraZoom?.();
      detachPinScaling?.();
      detachSteadyListener?.();
      detachMapErrorListener?.();
      mapRef.current = null;
      container.replaceChildren();
    };
  }, [apiKey, mapPins]);

  const resetView = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setGoogleMapMode(map, mapModeRef.current);
  }, []);

  const toggleObliqueView = useCallback(() => {
    const map = mapRef.current;
    const nextIsObliqueView = mapModeRef.current !== "oblique";

    mapModeRef.current = nextIsObliqueView ? "oblique" : "top-down";
    setIsObliqueView(nextIsObliqueView);

    if (!map) return;
    setGoogleMapMode(map, mapModeRef.current);
  }, []);

  if (loadFailed) {
    return <GoogleMapUnavailable reason="load-error" />;
  }

  return (
    <section className={styles.mapBoard} aria-label="Photorealistic 3D Tompkins Square Park map">
      <div className={styles.mapViewport}>
        <div className={styles.googleMapCanvas} ref={mapContainerRef}>
          <div className={styles.googleMapLoading}>Loading 3D Tompkins...</div>
        </div>
      </div>

      <div className={styles.mapZoomControls} aria-label="Map controls">
        <button type="button" onClick={resetView}>Fit</button>
        <button
          aria-pressed={isObliqueView}
          data-active={isObliqueView ? "true" : undefined}
          type="button"
          onClick={toggleObliqueView}
        >
          3D
        </button>
      </div>
    </section>
  );
}

export function TompkinsMap({ items, onError, onReady }: TompkinsMapProps) {
  const hasApiKey = hasGoogleMapsApiKey();

  useEffect(() => {
    if (!hasApiKey) onError?.();
  }, [hasApiKey, onError]);

  if (!hasApiKey) {
    return <GoogleMapUnavailable reason="missing-key" />;
  }

  return <GoogleTompkinsMap apiKey={publicEnv.googleMapsApiKey} items={items} onError={onError} onReady={onReady} />;
}
