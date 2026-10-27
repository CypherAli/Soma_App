import type { Structure } from "../core/types";
export interface ViewerStructure extends Structure {
  category: string;
  kind?: "part" | "group";
  parentLabel?: string;
}
export interface ViewerGroup {
  key: string;
  label: string;
  count: number;
  visible?: boolean;
}
export interface ViewerState {
  side?: "left" | "right" | "both";
  availableSides?: ("left" | "right" | "both")[];
  explode: number;
  explodeScope?: "all" | "selected";
  isolate: boolean;
  hiddenCategories: string[];
  hiddenCount: number;
  selectedHidden: boolean;
  selectedFaded: boolean;
  showLabels: boolean;
  view: string;
  clip: {
    enabled: boolean;
    axis: "x" | "y" | "z";
    percent: number;
    keepPositive: boolean;
  };
}
export type ViewerEvent =
  | {
      type: "ready";
      structures: ViewerStructure[];
      groups: ViewerGroup[];
      state?: ViewerState;
    }
  | { type: "state"; state: ViewerState }
  | { type: "selected"; structure: ViewerStructure | null }
  | { type: "error" | "unavailable"; message: string };
export interface ViewerCommand {
  type:
    | "appearance"
    | "reset"
    | "restore"
    | "select"
    | "visibility"
    | "side"
    | "zoom"
    | "explode"
    | "isolate"
    | "hide"
    | "fade"
    | "clip"
    | "view"
    | "labels";
  dark?: boolean;
  locale?: "vi" | "en";
  factor?: number;
  meshName?: string;
  category?: string;
  visible?: boolean;
  side?: "left" | "right" | "both";
  amount?: number;
  scope?: "all" | "selected";
  enabled?: boolean;
  view?: "front" | "back" | "side" | "three-quarter" | "top" | "bottom";
  axis?: "x" | "y" | "z";
  percent?: number;
  keepPositive?: boolean;
}
export interface ViewerHandle {
  command: (value: ViewerCommand) => void;
}
export interface ViewerProps {
  uri: string;
  onEvent: (event: ViewerEvent) => void;
  onError: (message: string) => void;
}
export { parseViewerEvent } from "./viewerProtocol";
