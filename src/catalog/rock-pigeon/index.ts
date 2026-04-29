import type { CatalogExperienceConfig } from "@/catalog/types";
import { RockPigeonExperience } from "@/catalog/rock-pigeon/Experience";

export const rockPigeonExperience = {
  slug: "rock-pigeon",
  experienceKey: "rock-pigeon",
  Experience: RockPigeonExperience,
  media: [
    {
      role: "sticker",
      required: true,
      purpose: "Transparent pigeon cutout used by the existing page and homepage sticker grid.",
    },
    {
      role: "photo",
      required: false,
      purpose: "Optional urban behavior photos for the existing pigeon page.",
    },
  ],
} satisfies CatalogExperienceConfig;
