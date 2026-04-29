import type { ReactNode } from "react";
import { GenericSpeciesExperience } from "@/components/item-experiences/GenericSpeciesExperience";
import { HouseSparrowExperience } from "@/components/item-experiences/HouseSparrowExperience";
import { RockPigeonExperience } from "@/components/item-experiences/RockPigeonExperience";
import { SpecimenTreeExperience } from "@/components/item-experiences/SpecimenTreeExperience";
import { SquirrelExperience } from "@/components/item-experiences/SquirrelExperience";
import type { ItemPageData } from "@/lib/itemPageData";

type ExperienceComponent = (props: { data: ItemPageData }) => ReactNode;

const experienceRegistry: Record<string, ExperienceComponent> = {
  "american-elm": SpecimenTreeExperience,
  "eastern-gray-squirrel": SquirrelExperience,
  "house-sparrow": HouseSparrowExperience,
  "london-plane": SpecimenTreeExperience,
  "rock-pigeon": RockPigeonExperience,
};

export function ItemExperience({ data }: { data: ItemPageData }) {
  const key = data.catalogItem.experienceKey;
  const Experience = key ? experienceRegistry[key] : undefined;

  return Experience ? <Experience data={data} /> : <GenericSpeciesExperience data={data} />;
}
