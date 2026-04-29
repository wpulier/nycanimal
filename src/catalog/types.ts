import type { ReactNode } from "react";
import type { MediaAsset } from "@/lib/catalogSchema";
import type { ItemPageData } from "@/lib/itemPageData";

export type CatalogExperienceComponent = (props: { data: ItemPageData }) => ReactNode;

export type CatalogMediaSlot = {
  role: MediaAsset["role"];
  required: boolean;
  purpose: string;
};

export type CatalogExperienceConfig = {
  slug: string;
  experienceKey: string;
  media: CatalogMediaSlot[];
  Experience: CatalogExperienceComponent;
};
