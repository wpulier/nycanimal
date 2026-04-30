import { catalogItems } from "@/data/catalog";
import { tompkinsMapData } from "@/data/tompkinsMap";
import { catalogItemSlugForTreeSpecies } from "@/data/treeSpeciesCatalog";
import type { CatalogLocation } from "@/lib/catalogSchema";

type SourceTree = (typeof tompkinsMapData.trees)[number];

export const NYC_PARKS_FORESTRY_SOURCE_NAME = "NYC Parks Forestry Tree Points";

function treeLocationId(tree: SourceTree) {
  return `nyc-tree-${tree.id}`;
}

function withoutUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)) as T;
}

function treeLatinName(tree: SourceTree) {
  return "latinName" in tree ? tree.latinName : undefined;
}

export function catalogLocationSlugForTree(tree: { commonName: string; latinName?: string }) {
  return catalogItemSlugForTreeSpecies(tree.commonName, tree.latinName, catalogItems);
}

export function buildTompkinsTreeCatalogLocations(importedAt: string = tompkinsMapData.metadata.retrievedAt): CatalogLocation[] {
  return tompkinsMapData.trees.map((tree) => {
    const isActiveTree = "active" in tree ? tree.active : true;

    return {
      id: treeLocationId(tree),
      catalogItemSlug: catalogLocationSlugForTree({ commonName: tree.commonName, latinName: treeLatinName(tree) }),
      locationType: "individual-tree",
      coordinates: {
        latitude: tree.point.lat,
        longitude: tree.point.lng,
      },
      mapPoint: {
        x: tree.point.x,
        y: tree.point.y,
      },
      status: isActiveTree ? "active" : "hidden",
      visibility: "public",
      tree: withoutUndefined({
        nycTreeId: tree.id,
        dbh: "dbh" in tree ? tree.dbh : undefined,
        condition: "condition" in tree ? tree.condition : undefined,
        structure: "structure" in tree ? tree.structure : undefined,
        riskRating: "riskRating" in tree ? tree.riskRating : undefined,
        updatedDate: "updatedDate" in tree ? tree.updatedDate : undefined,
      }),
      source: withoutUndefined({
        name: NYC_PARKS_FORESTRY_SOURCE_NAME,
        sourceId: tree.id,
        url: tree.treeMapUrl,
        retrievedAt: tompkinsMapData.metadata.retrievedAt,
        importedAt,
      }),
    };
  });
}

export const tompkinsTreeCatalogLocations = buildTompkinsTreeCatalogLocations();
