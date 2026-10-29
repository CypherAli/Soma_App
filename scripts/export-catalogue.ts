import { catalogScenes } from "../../Soma_Fe/src/lib/catalog";
import { sceneModules } from "../../Soma_Fe/src/lib/sceneModules";
import { atlasScenes } from "../../Soma_Fe/src/lib/humanAtlas/scenes";
import { contentSourceId } from "../../Soma_Fe/src/lib/content/source";
import { localizedPartName } from "../../Soma_Fe/src/lib/humanAtlas/partNames";
import { partLearning } from "../../Soma_Fe/src/lib/humanAtlas/learning";
import { SYSTEMS, type Atlas } from "../../Soma_Fe/src/lib/humanAtlas/anatomy";

export function exportCatalogue(atlas: Atlas) {
  const models = catalogScenes.map((card) => {
    const scene = atlasScenes[card.slug] ?? sceneModules[card.slug];
    if (!scene) throw new Error(`Missing web scene: ${card.slug}`);
    return {
      id: card.slug,
      kind: atlasScenes[card.slug] ? "atlas" : "glb",
      sourceId: contentSourceId(scene),
      system: card.system,
      thumbnail: card.thumb,
      definition: scene,
    };
  });
  const parts = Object.fromEntries(
    atlas.parts.map((part) => {
      const learning = partLearning(part.id);
      return [
        part.id,
        {
          id: part.id,
          meshName: part.id,
          label: localizedPartName(part, "vi"),
          english: part.name,
          latin: learning?.latin ?? "",
          note: learning?.note?.vi ?? "",
          sources: learning?.sources ?? [],
          category: part.system,
        },
      ];
    }),
  );
  return { models, parts, systems: SYSTEMS };
}
