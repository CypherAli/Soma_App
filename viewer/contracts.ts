import type { AtlasSceneDef } from "./shared/sceneTypes";
import type { AnatomyModel } from "../src/core/types";
import type {
  ViewerCommand,
  ViewerState,
  ViewerStructure,
} from "../src/components/Viewer.types";
export interface ViewerConfig {
  preview?: boolean;
  transparent?: boolean;
  resourceBase?: string;
  inlineAssets?: Record<string, string>;
  modelPath?: string;
  dark: boolean;
  locale?: "vi" | "en";
  model: AnatomyModel;
  scene: AtlasSceneDef;
  atlasPath: string;
  parts: Record<string, ViewerStructure>;
  systems: { id: string; name: string; color: string }[];
}
declare global {
  interface Window {
    SOMA_VIEWER_CONFIG: ViewerConfig;
    ReactNativeWebView?: { postMessage: (value: string) => void };
    somaMobileCommand?: (value: ViewerCommand) => void;
    somaMobileDebug?: () => {
      state: ViewerState;
      parts: {
        id: string;
        visible: boolean;
        position: number[];
        bounds: number[][];
      }[];
      rendered: number;
      camera: { position: number[]; target: number[]; quaternion: number[] };
      quality: { pixelRatio: number; antialias: boolean };
      preview: boolean;
      autoRotate: boolean;
    };
  }
}
