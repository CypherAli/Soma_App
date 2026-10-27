import assert from "node:assert/strict";
import { test } from "node:test";
import { parseViewerEvent } from "../src/components/Viewer.types";

test("a complete atlas with more than 2000 structures can finish loading", () => {
  const event = parseViewerEvent({
    source: "soma-mobile-viewer",
    type: "ready",
    structures: Array.from({ length: 2234 }, (_, index) => ({
      meshName: `FJ${index}`,
    })),
    groups: [],
  });
  assert.equal(event?.type, "ready");
});
test("the viewer state bridge supports separation and rejects unrelated window messages", () => {
  const message = {
    source: "soma-mobile-viewer",
    type: "state",
    state: {
      explode: 1,
      isolate: false,
      hiddenCategories: [],
      clip: { enabled: false, axis: "y", percent: 50 },
    },
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
