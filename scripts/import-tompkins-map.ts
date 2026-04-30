type LonLat = [number, number];
type ProjectedPoint = { x: number; y: number; lat: number; lng: number };

type ParksProperty = {
  gispropnum: string;
  signname: string;
  acres: string;
  location: string;
  multipolygon: { coordinates: LonLat[][][] };
};

type SocrataPoint = {
  type: "Point";
  coordinates: LonLat;
};

type ForestryTreePoint = {
  objectid: string;
  dbh?: string;
  tpstructure?: string;
  tpcondition?: string;
  genusspecies?: string;
  updateddate?: string;
  createddate?: string;
  riskrating?: string;
  riskratingdate?: string;
  location: SocrataPoint;
};

type OsmNode = {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
};

type OsmWay = {
  type: "way";
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
};

type OsmElement = OsmNode | OsmWay | { type: "relation"; id: number; tags?: Record<string, string> };

type OsmResponse = {
  elements: OsmElement[];
};

type MapSource = {
  label: string;
  url: string;
  retrievedAt: string;
};

type MapPath = {
  id: string;
  name: string;
  kind: "footway" | "service-path";
  points: ProjectedPoint[];
};

type MapZone = {
  id: string;
  name: string;
  kind: "dog-run" | "playground" | "court" | "pool" | "garden" | "park-feature";
  points: ProjectedPoint[];
};

type MapLandmark = {
  id: string;
  name: string;
  kind: "bathroom" | "water" | "bench" | "picnic" | "memorial" | "landmark";
  point: ProjectedPoint;
};

type MapTree = {
  id: string;
  active: boolean;
  commonName: string;
  latinName?: string;
  dbh?: number;
  condition?: string;
  structure?: string;
  riskRating?: string;
  updatedDate?: string;
  point: ProjectedPoint;
  treeMapUrl: string;
};

const VIEW_SIZE = 1000;
const VIEW_PADDING = 72;
const TOMPKINS_BBOX = {
  north: 40.72785,
  south: 40.72505,
  west: -73.98355,
  east: -73.9799,
};

const PARKS_URL = "https://data.cityofnewyork.us/resource/enfh-gkve.json?gispropnum=M088";
const FORESTRY_URL = "https://data.cityofnewyork.us/resource/hn5i-inap.json";
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

function assertResponse(response: Response, label: string) {
  if (!response.ok) {
    throw new Error(`${label} failed: ${response.status} ${response.statusText}`);
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  assertResponse(response, url);
  return (await response.json()) as T;
}

function encodeSocrata(params: Record<string, string>) {
  return new URLSearchParams(params).toString();
}

function withinBoxWhere() {
  const { north, west, south, east } = TOMPKINS_BBOX;
  return `within_box(location,${north},${west},${south},${east})`;
}

function pointInPolygon(point: LonLat, polygon: LonLat[]) {
  const [x, y] = point;
  let inside = false;
  let j = polygon.length - 1;

  for (let i = 0; i < polygon.length; i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const crosses = yi > y !== yj > y;
    if (crosses && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
    j = i;
  }

  return inside;
}

function centroid(points: LonLat[]): LonLat {
  const total = points.reduce(
    (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
    { lng: 0, lat: 0 },
  );
  return [total.lng / points.length, total.lat / points.length];
}

function isClosed(points: LonLat[]) {
  if (points.length < 4) return false;
  const first = points[0];
  const last = points[points.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}

function sourceName(tags: Record<string, string> | undefined, fallback: string) {
  return tags?.name ?? tags?.amenity ?? tags?.leisure ?? tags?.sport ?? tags?.historic ?? tags?.tourism ?? fallback;
}

function classifyZone(tags: Record<string, string> | undefined): MapZone["kind"] | null {
  if (!tags) return null;
  if (tags.leisure === "dog_park") return "dog-run";
  if (tags.leisure === "playground") return "playground";
  if (tags.leisure === "swimming_pool") return "pool";
  if (tags.leisure === "garden") return "garden";
  if (tags.leisure === "pitch" || tags.sport === "basketball") return "court";
  if (tags.leisure || tags.amenity || tags.tourism || tags.historic) return "park-feature";
  return null;
}

function classifyLandmark(tags: Record<string, string> | undefined): MapLandmark["kind"] | null {
  if (!tags) return null;
  if (tags.amenity === "toilets") return "bathroom";
  if (tags.amenity === "drinking_water") return "water";
  if (tags.amenity === "bench") return "bench";
  if (tags.amenity === "picnic_table") return "picnic";
  if (tags.historic === "memorial" || tags.memorial) return "memorial";
  if (tags.tourism || tags.historic) return "landmark";
  return null;
}

function parseSpecies(value: string | undefined) {
  if (!value) return { commonName: "Unknown tree", latinName: undefined };
  const [latin, common] = value.split(" - ");
  return {
    latinName: latin && latin !== "Unknown" ? latin.trim() : undefined,
    commonName: common?.trim() || latin?.trim() || "Unknown tree",
  };
}

function projectFactory(boundary: LonLat[]) {
  const center = centroid(boundary);
  const latScale = 111_320;
  const lngScale = Math.cos((center[1] * Math.PI) / 180) * 111_320;

  function raw([lng, lat]: LonLat) {
    return {
      x: (lng - center[0]) * lngScale,
      y: (center[1] - lat) * latScale,
    };
  }

  const rawBoundary = boundary.map(raw);
  const minX = Math.min(...rawBoundary.map((point) => point.x));
  const maxX = Math.max(...rawBoundary.map((point) => point.x));
  const minY = Math.min(...rawBoundary.map((point) => point.y));
  const maxY = Math.max(...rawBoundary.map((point) => point.y));
  const scale = Math.min((VIEW_SIZE - VIEW_PADDING * 2) / (maxX - minX), (VIEW_SIZE - VIEW_PADDING * 2) / (maxY - minY));
  const offsetX = (VIEW_SIZE - (maxX - minX) * scale) / 2;
  const offsetY = (VIEW_SIZE - (maxY - minY) * scale) / 2;

  return ([lng, lat]: LonLat): ProjectedPoint => ({
    lng: Number(lng.toFixed(8)),
    lat: Number(lat.toFixed(8)),
    x: Number((offsetX + (raw([lng, lat]).x - minX) * scale).toFixed(2)),
    y: Number((offsetY + (raw([lng, lat]).y - minY) * scale).toFixed(2)),
  });
}

async function fetchBoundary() {
  const rows = await fetchJson<ParksProperty[]>(PARKS_URL);
  const park = rows[0];
  if (!park?.multipolygon?.coordinates?.[0]?.[0]) {
    throw new Error("Could not find Tompkins Square Park boundary from NYC Parks Properties.");
  }

  return {
    name: park.signname,
    gisPropNum: park.gispropnum,
    acres: Number(park.acres),
    location: park.location,
    boundary: park.multipolygon.coordinates[0][0].slice(0, -1),
  };
}

async function fetchTrees(boundary: LonLat[], project: (point: LonLat) => ProjectedPoint) {
  const url = `${FORESTRY_URL}?${encodeSocrata({ $limit: "5000", $where: withinBoxWhere() })}`;
  const rows = await fetchJson<ForestryTreePoint[]>(url);
  const insideRows = rows.filter((row) => pointInPolygon(row.location.coordinates, boundary));
  const activeRows = insideRows.filter((row) => row.tpstructure === "Full" && row.tpcondition !== "Dead");

  return {
    fetchedCount: rows.length,
    insideParkCount: insideRows.length,
    activeInsideParkCount: activeRows.length,
    trees: insideRows.map((row): MapTree => {
      const species = parseSpecies(row.genusspecies);
      const active = row.tpstructure === "Full" && row.tpcondition !== "Dead";
      return {
        id: row.objectid,
        active,
        ...species,
        dbh: row.dbh ? Number(row.dbh) : undefined,
        condition: row.tpcondition,
        structure: row.tpstructure,
        riskRating: row.riskrating,
        updatedDate: row.updateddate,
        point: project(row.location.coordinates),
        treeMapUrl: `https://tree-map.nycgovparks.org/tree-map/tree/${row.objectid}`,
      };
    }),
  };
}

async function fetchOsmFeatures(boundary: LonLat[], project: (point: LonLat) => ProjectedPoint) {
  const { south, west, north, east } = TOMPKINS_BBOX;
  const query = `
[out:json][timeout:30];
(
  way(${south},${west},${north},${east})["highway"~"^(footway|path|service)$"];
  way(${south},${west},${north},${east})["leisure"];
  way(${south},${west},${north},${east})["amenity"];
  way(${south},${west},${north},${east})["sport"];
  way(${south},${west},${north},${east})["historic"];
  way(${south},${west},${north},${east})["tourism"];
  node(${south},${west},${north},${east})["amenity"];
  node(${south},${west},${north},${east})["historic"];
  node(${south},${west},${north},${east})["tourism"];
);
out body;
>;
out skel qt;`;

  const response = await fetch(OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8", "User-Agent": "nycanimal-map-import/1.0" },
    body: new URLSearchParams({ data: query }).toString(),
  });
  assertResponse(response, "Overpass API");
  const data = (await response.json()) as OsmResponse;
  const nodeMap = new Map<number, OsmNode>();
  const paths: MapPath[] = [];
  const zones: MapZone[] = [];
  const landmarks: MapLandmark[] = [];

  for (const element of data.elements) {
    if (element.type === "node") {
      nodeMap.set(element.id, element);
    }
  }

  for (const element of data.elements) {
    if (element.type === "node") {
      const kind = classifyLandmark(element.tags);
      if (!kind || !pointInPolygon([element.lon, element.lat], boundary)) continue;
      landmarks.push({
        id: `osm-node-${element.id}`,
        name: sourceName(element.tags, kind),
        kind,
        point: project([element.lon, element.lat]),
      });
    }

    if (element.type !== "way") continue;
    const wayPoints = element.nodes
      .map((nodeId) => nodeMap.get(nodeId))
      .filter((node): node is OsmNode => Boolean(node))
      .map((node): LonLat => [node.lon, node.lat]);

    if (wayPoints.length < 2 || !pointInPolygon(centroid(wayPoints), boundary)) {
      continue;
    }

    if (isClosed(wayPoints)) {
      const kind = classifyZone(element.tags);
      if (kind) {
        zones.push({
          id: `osm-way-${element.id}`,
          name: sourceName(element.tags, kind.replace(/-/g, " ")),
          kind,
          points: wayPoints.map(project),
        });
      }
      continue;
    }

    if (element.tags?.highway) {
      paths.push({
        id: `osm-way-${element.id}`,
        name: sourceName(element.tags, "park path"),
        kind: element.tags.highway === "service" ? "service-path" : "footway",
        points: wayPoints.map(project),
      });
    }
  }

  return {
    osmElementCount: data.elements.length,
    paths: paths.sort((a, b) => a.id.localeCompare(b.id)),
    zones: zones.sort((a, b) => a.id.localeCompare(b.id)),
    landmarks: landmarks
      .filter((landmark, index, all) => all.findIndex((candidate) => candidate.id === landmark.id) === index)
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

function formatTs(value: unknown) {
  return JSON.stringify(value, null, 2).replace(/"([^"\\]*(?:\\.[^"\\]*)*)":/g, "$1:");
}

async function main() {
  const retrievedAt = new Date().toISOString();
  const boundaryResult = await fetchBoundary();
  const project = projectFactory(boundaryResult.boundary);
  const [treeResult, osmResult] = await Promise.all([
    fetchTrees(boundaryResult.boundary, project),
    fetchOsmFeatures(boundaryResult.boundary, project),
  ]);

  const sources: MapSource[] = [
    { label: "NYC Parks Properties", url: "https://data.cityofnewyork.us/Recreation/Parks-Properties/enfh-gkve", retrievedAt },
    { label: "NYC Parks Forestry Tree Points", url: "https://data.cityofnewyork.us/Environment/Forestry-Tree-Points/hn5i-inap", retrievedAt },
    { label: "OpenStreetMap via Overpass API", url: "https://www.openstreetmap.org/way/25162896", retrievedAt },
    { label: "NYC Tree Map validation", url: "https://tree-map.nycgovparks.org/", retrievedAt },
  ];

  const data = {
    metadata: {
      name: boundaryResult.name,
      gisPropNum: boundaryResult.gisPropNum,
      acres: boundaryResult.acres,
      location: boundaryResult.location,
      viewBox: { width: VIEW_SIZE, height: VIEW_SIZE, padding: VIEW_PADDING },
      retrievedAt,
      sourceCounts: {
        forestryBBoxTrees: treeResult.fetchedCount,
        forestryTreesInsidePark: treeResult.insideParkCount,
        activeTreesRendered: treeResult.activeInsideParkCount,
        osmElements: osmResult.osmElementCount,
        paths: osmResult.paths.length,
        zones: osmResult.zones.length,
        landmarks: osmResult.landmarks.length,
      },
    },
    sources,
    boundary: boundaryResult.boundary.map(project),
    paths: osmResult.paths,
    zones: osmResult.zones,
    landmarks: osmResult.landmarks,
    trees: treeResult.trees,
  };

  const file = `// Generated by scripts/import-tompkins-map.ts. Do not hand-edit coordinates.\n\nexport type MapPoint = {\n  x: number;\n  y: number;\n  lat: number;\n  lng: number;\n};\n\nexport type TompkinsMapData = typeof tompkinsMapData;\n\nexport const tompkinsMapData = ${formatTs(data)} as const;\n`;

  await import("node:fs/promises").then((fs) => fs.writeFile("src/data/tompkinsMap.ts", file));
  console.log(`Wrote src/data/tompkinsMap.ts`);
  console.log(data.metadata.sourceCounts);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
