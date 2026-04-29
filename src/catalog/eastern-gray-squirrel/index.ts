import type { CatalogExperienceConfig } from "@/catalog/types";
import { SquirrelExperience } from "@/catalog/eastern-gray-squirrel/Experience";

export const easternGraySquirrelExperience = {
  slug: "eastern-gray-squirrel",
  experienceKey: "eastern-gray-squirrel",
  Experience: SquirrelExperience,
  media: [
    {
      role: "sticker",
      required: true,
      purpose: "Transparent cutout used on the homepage and as the fallback hero art.",
    },
    {
      role: "model",
      required: false,
      purpose: "GLB used by the page-owned Three.js behavior stage.",
    },
    {
      role: "photo",
      required: false,
      purpose: "Optional field photos for future food-cache and tree-route sections.",
    },
  ],
} satisfies CatalogExperienceConfig;
