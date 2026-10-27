import type { ImageSourcePropType } from "react-native";
import type { AnatomyModel } from "../core/types";
import { OFFLINE_ART } from "./offlineArt";
export { ART_SCALE } from "./artScale";
export function modelArt(
  model: AnatomyModel,
  apiUrl: string,
): ImageSourcePropType | undefined {
  return (OFFLINE_ART as Record<string, ImageSourcePropType>)[model.id] ?? (model.thumbnailPath
    ? { uri: `${apiUrl}${model.thumbnailPath}` }
    : MODEL_ART[model.id]);
}
export const MODEL_ART: Record<string, ImageSourcePropType> = {
  "ban-tay": require("../../assets/anatomy/hand_bones.png"),
  "giai-phau-tim": require("../../assets/anatomy/heart_anatomy.png"),
  "giai-phau-phoi": require("../../assets/anatomy/lung_anatomy.png"),
  "giai-phau-gan": require("../../assets/anatomy/liver_anatomy.png"),
  "than-nao-day-so": require("../../assets/anatomy/brainstem_cranial_nerves.png"),
};
