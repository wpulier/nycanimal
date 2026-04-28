import { tompkinsMapData } from "@/data/tompkinsMap";

export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export function projectGeoToTompkinsMap({ latitude, longitude }: GeoPoint) {
  const boundary = tompkinsMapData.boundary.map((point) => [point.lng, point.lat] as const);
  const center = boundary.reduce(
    (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
    { lng: 0, lat: 0 },
  );
  center.lng /= boundary.length;
  center.lat /= boundary.length;

  const latScale = 111_320;
  const lngScale = Math.cos((center.lat * Math.PI) / 180) * 111_320;

  function raw([lng, lat]: readonly [number, number]) {
    return {
      x: (lng - center.lng) * lngScale,
      y: (center.lat - lat) * latScale,
    };
  }

  const rawBoundary = boundary.map(raw);
  const minX = Math.min(...rawBoundary.map((point) => point.x));
  const maxX = Math.max(...rawBoundary.map((point) => point.x));
  const minY = Math.min(...rawBoundary.map((point) => point.y));
  const maxY = Math.max(...rawBoundary.map((point) => point.y));
  const { width, height, padding } = tompkinsMapData.metadata.viewBox;
  const scale = Math.min((width - padding * 2) / (maxX - minX), (height - padding * 2) / (maxY - minY));
  const offsetX = (width - (maxX - minX) * scale) / 2;
  const offsetY = (height - (maxY - minY) * scale) / 2;
  const projected = raw([longitude, latitude]);

  return {
    x: offsetX + (projected.x - minX) * scale,
    y: offsetY + (projected.y - minY) * scale,
  };
}
