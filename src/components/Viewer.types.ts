import type { Structure } from "../core/types";
export interface ViewerStructure extends Structure {
  category: string;
}
export interface ViewerGroup {
  key: string;
  label: string;
  count: number;
}
export type ViewerEvent =
  | { type: "ready"; structures: ViewerStructure[]; groups: ViewerGroup[] }
  | { type: "selected"; structure: ViewerStructure | null }
  | { type: "error" | "unavailable"; message: string };
export interface ViewerCommand {
  type: "reset" | "select" | "visibility" | "side" | "zoom";
  factor?: number;
  meshName?: string;
  category?: string;
  visible?: boolean;
  side?: "left" | "right" | "both";
}
export interface ViewerHandle {
  command: (value: ViewerCommand) => void;
}
export interface ViewerProps {
  uri: string;
  onEvent: (event: ViewerEvent) => void;
  onError: (message: string) => void;
}
export function parseViewerEvent(value: unknown): ViewerEvent | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (data.source !== "soma-mobile-viewer") return null;
  if (
    data.type === "ready" &&
    Array.isArray(data.structures) &&
    Array.isArray(data.groups) &&
    data.structures.length <= 2000
  )
    return data as unknown as ViewerEvent;
  if (
    data.type === "selected" &&
    (data.structure === null ||
      (typeof data.structure === "object" &&
        data.structure !== null &&
        "meshName" in data.structure))
  )
    return data as unknown as ViewerEvent;
  if (
    (data.type === "error" || data.type === "unavailable") &&
    typeof data.message === "string"
  )
    return data as unknown as ViewerEvent;
  return null;
}
