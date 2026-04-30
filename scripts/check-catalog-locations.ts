import { allCatalogItems } from "../src/data/catalog";
import { tompkinsMapData } from "../src/data/tompkinsMap";
import { buildTompkinsTreeCatalogLocations } from "../src/data/catalogLocations";
import { catalogLocationSchema } from "../src/lib/catalogSchema";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const locations = buildTompkinsTreeCatalogLocations().map((location) => catalogLocationSchema.parse(location));
const itemSlugs = new Set(allCatalogItems.map((item) => item.slug));
const sourceSpeciesCount = new Set(
  tompkinsMapData.trees.map((tree) => `${"latinName" in tree ? tree.latinName : ""}::${tree.commonName}`),
).size;
const locationSpeciesCount = new Set(locations.map((location) => location.catalogItemSlug)).size;
const activePublicLocations = locations.filter((location) => location.status === "active" && location.visibility === "public");
const publicLocations = locations.filter((location) => location.visibility === "public");
const americanElmLocation = locations.find((location) => location.tree?.nycTreeId === "5103318");

assert(locations.length === tompkinsMapData.metadata.sourceCounts.forestryTreesInsidePark, "Expected every in-park NYC tree to become a catalog location.");
assert(publicLocations.length === locations.length, "Expected all imported Tompkins tree locations to be public.");
assert(
  activePublicLocations.length === tompkinsMapData.metadata.sourceCounts.activeTreesRendered,
  "Expected active public locations to match the active/full in-park source count.",
);
assert(locationSpeciesCount === sourceSpeciesCount, "Expected location species count to match source tree species count.");
assert(americanElmLocation?.catalogItemSlug === "american-elm", "Expected NYC tree 5103318 to link to american-elm.");

for (const location of locations) {
  assert(location.status === "active" || location.status === "hidden", `Expected ${location.id} to be active or hidden.`);
  assert(location.visibility === "public", `Expected ${location.id} to be public.`);
  assert(location.locationType === "individual-tree", `Expected ${location.id} to be an individual tree.`);
  assert(itemSlugs.has(location.catalogItemSlug), `Missing catalog item for ${location.id}: ${location.catalogItemSlug}.`);
  assert(location.coordinates.latitude >= -90 && location.coordinates.latitude <= 90, `Invalid latitude for ${location.id}.`);
  assert(location.coordinates.longitude >= -180 && location.coordinates.longitude <= 180, `Invalid longitude for ${location.id}.`);
}

console.log("Catalog locations snapshot OK", {
  activePublicLocations: activePublicLocations.length,
  publicLocations: publicLocations.length,
  species: locationSpeciesCount,
  sourceRetrievedAt: tompkinsMapData.metadata.retrievedAt,
});
