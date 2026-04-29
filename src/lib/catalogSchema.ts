import { z } from "zod";

export const catalogKindSchema = z.enum([
  "bird",
  "plant",
  "tree",
  "mammal",
  "insect",
  "fungus",
  "object",
]);

export const pageModeSchema = z.enum(["field-card", "scroll-story", "specimen"]);

export const mediaRoleSchema = z.enum(["sticker", "photo", "video", "reference"]);

export const catalogPositionSchema = z.object({
  catalogX: z.number().min(0).max(100),
  catalogY: z.number().min(0).max(100),
  mapX: z.number().min(0).max(100),
  mapY: z.number().min(0).max(100),
});

export const stickerLayoutSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0),
  width: z.number().min(64).max(380),
  rotate: z.number().min(-35).max(35),
  zIndex: z.number().int().min(0).max(100).optional(),
  featured: z.boolean().optional(),
  label: z.string().min(1).max(80).optional(),
  status: z.string().min(1).max(48).optional(),
});

export const geoPointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const mapPointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const mediaAssetSchema = z.object({
  id: z.string().min(1),
  itemSlug: z.string().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  role: mediaRoleSchema,
  storagePath: z.string().min(1),
  downloadUrl: z.string().url(),
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().nonnegative(),
  status: z.enum(["draft", "published"]).default("published"),
});

const stickerImageSrcSchema = z.union([
  z.string().url(),
  z.string().regex(/^\/(?!\/)[^\s]*$/),
]);

export const catalogItemSchema = z.object({
  slug: z.string().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  commonName: z.string().min(2),
  latinName: z.string().min(2).optional(),
  kind: catalogKindSchema,
  sticker: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  angle: z.number().min(-30).max(30),
  position: catalogPositionSchema,
  stickerLayout: stickerLayoutSchema.optional(),
  coordinates: geoPointSchema.optional(),
  geo: geoPointSchema.optional(),
  treeRefs: z.array(z.string().min(1)).default([]),
  summary: z.string().min(20),
  seasonalNote: z.string().min(10),
  pageMode: pageModeSchema,
  facts: z.array(z.string().min(4)).min(1).max(8),
  mediaRefs: z.array(z.string()).default([]),
  stickerAssetId: z.string().optional(),
  stickerImageUrl: stickerImageSrcSchema.optional(),
  searchNames: z.array(z.string()).default([]),
  status: z.enum(["draft", "published"]).default("published"),
});

export const llmCatalogDraftSchema = z.object({
  suggestedItem: catalogItemSchema.extend({
    status: z.enum(["draft", "published"]).default("draft"),
  }),
  source: z.object({
    type: z.enum(["note", "photo", "field-observation", "import"]),
    note: z.string().optional(),
    photoRef: z.string().optional(),
    observedAt: z.string().optional(),
    location: z
      .object({
        latitude: z.number(),
        longitude: z.number(),
        accuracyMeters: z.number().optional(),
      })
      .optional(),
  }),
  llm: z.object({
    model: z.string().min(1),
    confidence: z.number().min(0).max(1),
    rationale: z.string().min(1),
  }),
});

export const treePointSchema = z.object({
  id: z.string().min(1),
  catalogItemSlug: z.string().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  commonName: z.string().min(1),
  latinName: z.string().min(1).optional(),
  dbh: z.number().optional(),
  condition: z.string().optional(),
  structure: z.string().optional(),
  riskRating: z.string().optional(),
  updatedDate: z.string().optional(),
  coordinates: geoPointSchema.optional(),
  mapPoint: mapPointSchema.optional(),
  treeMapUrl: z.string().url().optional(),
  source: z.literal("nyc-parks-forestry-tree-points").default("nyc-parks-forestry-tree-points"),
});

export type CatalogItem = z.infer<typeof catalogItemSchema>;
export type LlmCatalogDraft = z.infer<typeof llmCatalogDraftSchema>;
export type MediaAsset = z.infer<typeof mediaAssetSchema>;
export type TreePoint = z.infer<typeof treePointSchema>;
