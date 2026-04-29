import { getTreeSpeciesCatalogItems } from "@/data/treeSpeciesCatalog";

export type CatalogKind = "bird" | "plant" | "tree" | "object" | "mammal" | "insect" | "fungus";

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
  stickerLayout?: {
    x: number;
    y: number;
    width: number;
    rotate: number;
    zIndex?: number;
    featured?: boolean;
    label?: string;
    status?: string;
  };
  mapPin?: {
    enabled: boolean;
    label?: string;
    imageUrl?: string;
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
  mediaRefs?: string[];
  stickerAssetId?: string;
  stickerImageUrl?: string;
  summary: string;
  seasonalNote: string;
  pageMode: "field-card" | "scroll-story" | "specimen";
  experienceKey?: string;
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
    stickerImageUrl: "/stickers/rock-pigeon.png",
    stickerLayout: {
      x: 38,
      y: 420,
      width: 224,
      rotate: -7,
      zIndex: 20,
      featured: true,
    },
    summary: "The park's most visible city bird, adapted to pavement, benches, crumbs, ledges, and crowds.",
    seasonalNote: "Visible year-round, with extra activity around open lawns and paths after lunch hours.",
    pageMode: "scroll-story",
    experienceKey: "rock-pigeon",
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
    stickerLayout: { x: 75, y: 700, width: 132, rotate: -8, zIndex: 9 },
    summary: "Small, loud, social birds that work the edges of playgrounds, fences, and cafe tables.",
    seasonalNote: "Easy to spot in shrubs and fence lines, especially when leaves are sparse.",
    pageMode: "field-card",
    experienceKey: "house-sparrow",
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
    stickerLayout: { x: 44, y: 820, width: 136, rotate: 10, zIndex: 8 },
    coordinates: { latitude: 40.72669402, longitude: -73.98183092 },
    geo: { latitude: 40.72669402, longitude: -73.98183092 },
    treeRefs: ["5103318"],
    summary: "A tall canopy tree with arching limbs that shapes the park's shade and seasonal color.",
    seasonalNote: "Spring leaf-out, summer shade, yellow fall color, and winter branch structure all tell different stories.",
    pageMode: "specimen",
    experienceKey: "american-elm",
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
    stickerLayout: { x: 74, y: 1180, width: 138, rotate: -12, zIndex: 8 },
    summary: "A tough city tree with mottled bark that handles compacted soil and urban air better than most.",
    seasonalNote: "The peeling bark is visible all year and becomes a strong visual identifier in winter.",
    pageMode: "specimen",
    experienceKey: "london-plane",
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
    stickerLayout: { x: 74, y: 405, width: 126, rotate: 9, zIndex: 10 },
    summary: "Fast, acrobatic mammals that turn fences, trunks, and trash cans into connected routes.",
    seasonalNote: "Most frantic in fall when caching food; easiest to watch near mature trees.",
    pageMode: "scroll-story",
    experienceKey: "eastern-gray-squirrel",
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
    stickerLayout: { x: 25, y: 1320, width: 132, rotate: 5, zIndex: 7 },
    summary: "A built texture of the park: habitat edge, water channel, heat sink, and historical surface all at once.",
    seasonalNote: "After rain, small textures and mossy seams become easier to notice.",
    pageMode: "field-card",
    facts: ["Hard surfaces create warm microclimates.", "Edges collect leaves, seeds, and insects.", "A useful non-living catalog item for the field guide."],
  },
];

export const generatedTreeSpeciesItems = getTreeSpeciesCatalogItems(catalogItems);
export const allCatalogItems = [...catalogItems, ...generatedTreeSpeciesItems];

export function getCatalogItem(slug: string) {
  return allCatalogItems.find((item) => item.slug === slug);
}
