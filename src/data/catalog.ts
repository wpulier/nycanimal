export type CatalogKind = "bird" | "plant" | "tree" | "object" | "mammal";

export type CatalogItem = {
  slug: string;
  commonName: string;
  latinName?: string;
  kind: CatalogKind;
  sticker: string;
  color: string;
  angle: number;
  position: {
    catalogX: number;
    catalogY: number;
    mapX: number;
    mapY: number;
  };
  geo?: {
    latitude: number;
    longitude: number;
  };
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  treeRefs?: string[];
  summary: string;
  seasonalNote: string;
  pageMode: "field-card" | "scroll-story" | "specimen";
  facts: string[];
};

export const catalogItems: CatalogItem[] = [
  {
    slug: "rock-pigeon",
    commonName: "Rock Pigeon",
    latinName: "Columba livia",
    kind: "bird",
    sticker: "Pigeon",
    color: "#a7b7ff",
    angle: -8,
    position: { catalogX: 10, catalogY: 18, mapX: 54, mapY: 42 },
    summary: "The park's most visible city bird, adapted to pavement, benches, crumbs, ledges, and crowds.",
    seasonalNote: "Visible year-round, with extra activity around open lawns and paths after lunch hours.",
    pageMode: "scroll-story",
    facts: ["Descended from cliff-nesting rock doves.", "Uses magnetic and visual cues to navigate.", "Iridescent neck feathers shift with the viewing angle."],
  },
  {
    slug: "house-sparrow",
    commonName: "House Sparrow",
    latinName: "Passer domesticus",
    kind: "bird",
    sticker: "Sparrow",
    color: "#f2c078",
    angle: 11,
    position: { catalogX: 56, catalogY: 12, mapX: 35, mapY: 34 },
    summary: "Small, loud, social birds that work the edges of playgrounds, fences, and cafe tables.",
    seasonalNote: "Easy to spot in shrubs and fence lines, especially when leaves are sparse.",
    pageMode: "field-card",
    facts: ["Often moves in quick groups.", "Males have darker bib markings.", "Thrives around human-built habitats."],
  },
  {
    slug: "american-elm",
    commonName: "American Elm",
    latinName: "Ulmus americana",
    kind: "tree",
    sticker: "Elm",
    color: "#8fbc6b",
    angle: -15,
    position: { catalogX: 30, catalogY: 48, mapX: 63, mapY: 58 },
    coordinates: { latitude: 40.72669402, longitude: -73.98183092 },
    geo: { latitude: 40.72669402, longitude: -73.98183092 },
    treeRefs: ["5103318"],
    summary: "A tall canopy tree with arching limbs that shapes the park's shade and seasonal color.",
    seasonalNote: "Spring leaf-out, summer shade, yellow fall color, and winter branch structure all tell different stories.",
    pageMode: "specimen",
    facts: ["Leaves are asymmetrical at the base.", "Mature elms can create vase-like silhouettes.", "Good candidate for a seasonal photo timeline."],
  },
  {
    slug: "london-plane",
    commonName: "London Plane Tree",
    latinName: "Platanus x acerifolia",
    kind: "tree",
    sticker: "Plane Tree",
    color: "#d6a85e",
    angle: 7,
    position: { catalogX: 70, catalogY: 46, mapX: 44, mapY: 62 },
    summary: "A tough city tree with mottled bark that handles compacted soil and urban air better than most.",
    seasonalNote: "The peeling bark is visible all year and becomes a strong visual identifier in winter.",
    pageMode: "specimen",
    facts: ["Patchy bark makes camouflage-like patterns.", "Common throughout NYC streets and parks.", "Seed balls can hang through winter."],
  },
  {
    slug: "eastern-gray-squirrel",
    commonName: "Eastern Gray Squirrel",
    latinName: "Sciurus carolinensis",
    kind: "mammal",
    sticker: "Squirrel",
    color: "#b8b0a1",
    angle: 14,
    position: { catalogX: 14, catalogY: 72, mapX: 69, mapY: 30 },
    summary: "Fast, acrobatic mammals that turn fences, trunks, and trash cans into connected routes.",
    seasonalNote: "Most frantic in fall when caching food; easiest to watch near mature trees.",
    pageMode: "scroll-story",
    facts: ["Uses tail movements for balance and communication.", "Caches nuts in scattered locations.", "Can rotate ankles to descend trees headfirst."],
  },
  {
    slug: "cobblestone-edge",
    commonName: "Cobblestone Edge",
    kind: "object",
    sticker: "Stone",
    color: "#c7c2b7",
    angle: -4,
    position: { catalogX: 48, catalogY: 72, mapX: 24, mapY: 70 },
    summary: "A built texture of the park: habitat edge, water channel, heat sink, and historical surface all at once.",
    seasonalNote: "After rain, small textures and mossy seams become easier to notice.",
    pageMode: "field-card",
    facts: ["Hard surfaces create warm microclimates.", "Edges collect leaves, seeds, and insects.", "A useful non-living catalog item for the field guide."],
  },
];

export function getCatalogItem(slug: string) {
  return catalogItems.find((item) => item.slug === slug);
}
