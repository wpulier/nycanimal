import type { ReactNode } from "react";
import { easternGraySquirrelExperience } from "@/catalog/eastern-gray-squirrel";
import { rockPigeonExperience } from "@/catalog/rock-pigeon";
import { GenericSpeciesExperience } from "@/components/item-experiences/GenericSpeciesExperience";
import { HouseSparrowExperience } from "@/components/item-experiences/HouseSparrowExperience";
import { SpecimenTreeExperience } from "@/components/item-experiences/SpecimenTreeExperience";
import type { ItemPageData } from "@/lib/itemPageData";

type ExperienceComponent = (props: { data: ItemPageData }) => ReactNode;

const experienceRegistry: Record<string, ExperienceComponent> = {
  "american-elm": SpecimenTreeExperience,
  [easternGraySquirrelExperience.experienceKey]: easternGraySquirrelExperience.Experience,
  "house-sparrow": HouseSparrowExperience,
  "london-plane": SpecimenTreeExperience,
  [rockPigeonExperience.experienceKey]: rockPigeonExperience.Experience,
};

export function ItemExperience({ data }: { data: ItemPageData }) {
  const key = data.catalogItem.experienceKey;
  const Experience = key ? experienceRegistry[key] : undefined;

  return Experience ? <Experience data={data} /> : <GenericSpeciesExperience data={data} />;
}
