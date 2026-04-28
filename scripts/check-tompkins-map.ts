import { tompkinsMapData } from "../src/data/tompkinsMap";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const counts = tompkinsMapData.metadata.sourceCounts;
const americanElm = tompkinsMapData.trees.find((tree) => tree.id === "5103318");

assert(tompkinsMapData.metadata.gisPropNum === "M088", "Expected Tompkins Square Park GIS property M088.");
assert(tompkinsMapData.metadata.acres === 10.502, "Expected official 10.502 acre park record.");
assert(counts.forestryBBoxTrees >= 550 && counts.forestryBBoxTrees <= 650, "Unexpected Forestry bbox tree count.");
assert(counts.forestryTreesInsidePark >= 350, "Expected hundreds of Forestry trees inside the official park polygon.");
assert(counts.activeTreesRendered >= 300, "Expected at least 300 active rendered park trees.");
assert(counts.paths >= 20, "Expected OSM path geometry.");
assert(counts.zones >= 8, "Expected OSM park zones.");
assert(americanElm?.commonName === "American elm", "Expected NYC Tree Map/Forestry tree 5103318 American elm.");
assert(americanElm?.dbh === 44, "Expected tree 5103318 to have 44 inch DBH.");

console.log("Tompkins map snapshot OK", counts);
