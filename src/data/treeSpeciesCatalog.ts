import { tompkinsMapData } from "@/data/tompkinsMap";
import type { CatalogItem } from "@/data/catalog";

const palette = ["#8fbc6b", "#f2c078", "#d6a85e", "#a7b7ff", "#b8b0a1", "#76c878", "#c6d982", "#e5b66d"];

type SourceTree = {
  id: string;
  commonName: string;
  latinName?: string;
  point: {
    x: number;
    y: number;
    lat: number;
    lng: number;
  };
};

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "tree-species";
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (word.length <= 2 ? word : `${word[0].toUpperCase()}${word.slice(1)}`))
    .join(" ");
}

function speciesKey(item: Pick<CatalogItem, "commonName" | "latinName">) {
  return (item.latinName || item.commonName).toLowerCase().trim();
}

function displayCommonName(commonName: string) {
  if (/^[a-z]/.test(commonName)) return titleCase(commonName);
  return commonName;
}

function stickerLabel(commonName: string) {
  return displayCommonName(commonName)
    .replace(/^'(.+)'$/, "$1")
    .replace(/\b(Tree|tree)\b/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(" ");
}

export function catalogItemSlugForTreeSpecies(commonName: string, latinName?: string, curatedItems: CatalogItem[] = []) {
  const key = (latinName || commonName).toLowerCase().trim();
  const curatedMatch = curatedItems.find((item) => speciesKey(item) === key);

  if (curatedMatch) {
    return curatedMatch.slug;
  }

  return `tree-${toSlug(latinName || commonName)}`;
}

export function getTreeSpeciesCatalogItems(curatedItems: CatalogItem[] = []) {
  const curatedKeys = new Set(curatedItems.map(speciesKey));
  const grouped = new Map<string, SourceTree[]>();
  const sourceTrees = tompkinsMapData.trees as readonly SourceTree[];

  for (const tree of sourceTrees) {
    const key = (tree.latinName || tree.commonName).toLowerCase().trim();
    grouped.set(key, [...(grouped.get(key) ?? []), tree]);
  }

  const speciesGroups = [...grouped.values()]
    .filter((trees) => !curatedKeys.has((trees[0].latinName || trees[0].commonName).toLowerCase().trim()))
    .sort((a, b) => b.length - a.length || a[0].commonName.localeCompare(b[0].commonName));

  const columns = 7;
  const rows = Math.ceil(speciesGroups.length / columns);
  const xStep = 84 / Math.max(1, columns - 1);
  const yStep = 84 / Math.max(1, rows - 1);

  return speciesGroups.map((trees, index): CatalogItem => {
    const first = trees[0];
    const average = trees.reduce(
      (acc, tree) => ({
        latitude: acc.latitude + tree.point.lat,
        longitude: acc.longitude + tree.point.lng,
        x: acc.x + tree.point.x,
        y: acc.y + tree.point.y,
      }),
      { latitude: 0, longitude: 0, x: 0, y: 0 },
    );
    const count = trees.length;
    const commonName = displayCommonName(first.commonName);
    const catalogX = 8 + (index % columns) * xStep;
    const catalogY = 8 + Math.floor(index / columns) * yStep;

    return {
      slug: catalogItemSlugForTreeSpecies(first.commonName, first.latinName, curatedItems),
      commonName,
      latinName: first.latinName,
      kind: "tree",
      sticker: stickerLabel(first.commonName),
      color: palette[index % palette.length],
      angle: ((index * 11) % 38) - 19,
      position: {
        catalogX: Number(catalogX.toFixed(2)),
        catalogY: Number(catalogY.toFixed(2)),
        mapX: Number(((average.x / count) / 10).toFixed(2)),
        mapY: Number(((average.y / count) / 10).toFixed(2)),
      },
      coordinates: {
        latitude: Number((average.latitude / count).toFixed(8)),
        longitude: Number((average.longitude / count).toFixed(8)),
      },
      treeRefs: trees.map((tree) => tree.id),
      summary: `${commonName} appears in ${count} mapped NYC Parks tree ${count === 1 ? "record" : "records"} inside Tompkins Square Park. This generated species card links the map dots to a shared field-guide page.`,
      seasonalNote: "Use this page as a starting point for seasonal photos, bark notes, leaf details, and field observations collected in the park.",
      pageMode: "specimen",
      facts: [
        `${count} mapped ${count === 1 ? "tree" : "trees"} in the current Tompkins snapshot.`,
        first.latinName ? `Scientific name: ${first.latinName}.` : "Scientific name needs review.",
        "Generated from NYC Parks Forestry Tree Points and ready for a more bespoke page treatment.",
      ],
    };
  });
}
