import type {
  ViewerEvent,
  ViewerGroup,
  ViewerState,
  ViewerStructure,
} from "./Viewer.types";

type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue =>
  !!value && typeof value === "object" && !Array.isArray(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const finite = (value: unknown, min: number, max: number) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= min &&
  value <= max;
const side = (value: unknown) =>
  ["left", "right", "both"].includes(value as string);

function structure(value: unknown): value is ViewerStructure {
  if (
    !record(value) ||
    !["id", "meshName", "label", "english", "latin", "note", "category"].every(
      (key) => typeof value[key] === "string",
    )
  )
    return false;
  if (value.meshNames !== undefined && !strings(value.meshNames)) return false;
  if (
    value.sources !== undefined &&
    (!Array.isArray(value.sources) ||
      !value.sources.every(
        (item) =>
          record(item) &&
          typeof item.title === "string" &&
          (item.page === undefined ||
            finite(item.page, 0, Number.MAX_SAFE_INTEGER)) &&
          (item.url === undefined || typeof item.url === "string"),
      ))
  )
    return false;
  if (
    value.landmarks !== undefined &&
    (!Array.isArray(value.landmarks) ||
      !value.landmarks.every(
        (item) =>
          record(item) &&
          typeof item.label === "string" &&
          typeof item.note === "string" &&
          ["latin", "source"].every(
            (key) => item[key] === undefined || typeof item[key] === "string",
          ),
      ))
  )
    return false;
  return (
    value.kind === undefined || value.kind === "part" || value.kind === "group"
  );
}
function group(value: unknown): value is ViewerGroup {
  return (
    record(value) &&
    typeof value.key === "string" &&
    typeof value.label === "string" &&
    Number.isInteger(value.count) &&
    finite(value.count, 0, 10000) &&
    (value.visible === undefined || typeof value.visible === "boolean")
  );
}
function state(value: unknown): value is ViewerState {
  if (!record(value) || !record(value.clip)) return false;
  const clip = value.clip;
  return (
    finite(value.explode, 0, 1) &&
    strings(value.hiddenCategories) &&
    Number.isInteger(value.hiddenCount) &&
    finite(value.hiddenCount, 0, 10000) &&
    ["isolate", "selectedHidden", "selectedFaded", "showLabels"].every(
      (key) => typeof value[key] === "boolean",
    ) &&
    typeof value.view === "string" &&
    (value.side === undefined || side(value.side)) &&
    (value.availableSides === undefined ||
      (Array.isArray(value.availableSides) &&
        value.availableSides.every(side))) &&
    (value.explodeScope === undefined ||
      value.explodeScope === "all" ||
      value.explodeScope === "selected") &&
    typeof clip.enabled === "boolean" &&
    ["x", "y", "z"].includes(clip.axis as string) &&
    finite(clip.percent, 0, 100) &&
    typeof clip.keepPositive === "boolean"
  );
}

/** Validate messages before their nested values reach React lists or viewer controls. */
export function parseViewerEvent(value: unknown): ViewerEvent | null {
  if (!record(value) || value.source !== "soma-mobile-viewer") return null;
  if (
    value.type === "ready" &&
    Array.isArray(value.structures) &&
    value.structures.length <= 10000 &&
    value.structures.every(structure) &&
    Array.isArray(value.groups) &&
    value.groups.length <= 10000 &&
    value.groups.every(group) &&
    (value.state === undefined || state(value.state))
  )
    return value as unknown as ViewerEvent;
  if (value.type === "state" && state(value.state))
    return value as unknown as ViewerEvent;
  if (
    value.type === "selected" &&
    (value.structure === null || structure(value.structure))
  )
    return value as unknown as ViewerEvent;
  if (
    (value.type === "error" || value.type === "unavailable") &&
    typeof value.message === "string" &&
    value.message.trim().length > 0
  )
    return value as unknown as ViewerEvent;
  return null;
}
