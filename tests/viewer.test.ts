import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseViewerEvent,
  type ViewerState,
} from "../src/components/Viewer.types";
const structure = (id: string) => ({
  id,
  meshName: id,
  label: id,
  english: id,
  latin: "",
  note: "",
  category: "skeletal",
});
const validState: ViewerState = {
  explode: 0,
  isolate: false,
  hiddenCategories: [],
  hiddenCount: 0,
  selectedHidden: false,
  selectedFaded: false,
  showLabels: false,
  view: "front",
  clip: { enabled: false, axis: "y", percent: 50, keepPositive: true },
};

test("a complete atlas with more than 2000 structures can finish loading", () => {
  const event = parseViewerEvent({
    source: "soma-mobile-viewer",
    type: "ready",
    structures: Array.from({ length: 2234 }, (_, index) =>
      structure(`FJ${index}`),
    ),
    groups: [],
  });
  assert.equal(event?.type, "ready");
});
test("the viewer state bridge supports separation and rejects unrelated window messages", () => {
  const message = {
    source: "soma-mobile-viewer",
    type: "state",
    state: { ...validState, explode: 1 },
  };
  assert.equal(parseViewerEvent(message)?.type, "state");
  assert.equal(parseViewerEvent({ ...message, source: "other-frame" }), null);
  assert.equal(
    parseViewerEvent({
      ...message,
      state: { explode: "1", hiddenCategories: [] },
    }),
    null,
  );
});

test("viewer bridge rejects malformed nested payloads before rendering", () => {
  const source = "soma-mobile-viewer";
  for (const payload of [
    { type: "ready", structures: [null], groups: [] },
    {
      type: "ready",
      structures: [structure("one")],
      groups: [{ key: "x", label: "Layer", count: -1 }],
    },
    { type: "ready", structures: [], groups: [], state: null },
    {
      type: "selected",
      structure: { ...structure("one"), sources: "invalid" },
    },
    { type: "state", state: { ...validState, explode: NaN } },
    { type: "state", state: { ...validState, hiddenCategories: [null] } },
    {
      type: "state",
      state: { ...validState, clip: { ...validState.clip, percent: 101 } },
    },
    { type: "error", message: "" },
  ])
    assert.equal(parseViewerEvent({ source, ...payload }), null);
  assert.equal(
    parseViewerEvent({ source, type: "selected", structure: structure("one") })
      ?.type,
    "selected",
  );
  assert.equal(
    parseViewerEvent({ source, type: "selected", structure: null })?.type,
    "selected",
  );
});
