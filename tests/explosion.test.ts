import { test } from "node:test";
import assert from "node:assert/strict";
import { Box3, Vector3 } from "three";
import { anatomicalOffsets } from "../viewer/explosion";

test("explosion retains anatomical axes, depth and original dimensions", () => {
  const box = (x: number, y: number, z: number) =>
    new Box3().setFromCenterAndSize(
      new Vector3(x, y, z),
      new Vector3(0.2, 0.4, 0.3),
    );
  const items = [
    { id: "left", bounds: box(-1, 1, -0.5) },
    { id: "right", bounds: box(1, -1, 0.5) },
  ];
  const before = items.map((i) => i.bounds.clone());
  const offsets = anatomicalOffsets(items);
  assert.ok(offsets.get("left")!.x < 0 && offsets.get("right")!.x > 0);
  assert.ok(offsets.get("left")!.z < 0 && offsets.get("right")!.z > 0);
  items.forEach((item, i) => assert.ok(item.bounds.equals(before[i])));
});
test("separation is continuous at one percent and deterministic for concentric structures", () => {
  const items = [
    {
      id: "a",
      bounds: new Box3(new Vector3(-1, -1, -1), new Vector3(1, 1, 1)),
    },
    {
      id: "b",
      bounds: new Box3(
        new Vector3(-0.5, -0.5, -0.5),
        new Vector3(0.5, 0.5, 0.5),
      ),
    },
  ];
  const offsets = anatomicalOffsets(items);
  assert.ok(offsets.get("a")!.distanceTo(offsets.get("b")!) > 0);
  assert.deepEqual([...offsets], [...anatomicalOffsets(items)]);
  const full = offsets.get("a")!;
  assert.ok(
    Math.abs(
      full
        .clone()
        .multiplyScalar(0.02)
        .distanceTo(full.clone().multiplyScalar(0.01)) -
        full.length() * 0.01,
    ) < 1e-10,
  );
});
