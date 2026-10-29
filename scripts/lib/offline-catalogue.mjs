import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
export function offlineScene(data, id) {
  const pack = json(join(data, "scenes", id + ".soma"));
  const inlineAssets = Object.fromEntries(
    Object.entries(pack.buffers).map(([key, hash]) => [
      key,
      "data:application/octet-stream;base64," +
        readFileSync(join(data, "buffers", hash + ".soma")).toString("base64"),
    ]),
  );
  if (pack.config.model.kind === "glb")
    Object.assign(inlineAssets, json(join(data, "decoder.soma")));
  return { ...pack.config, inlineAssets, dark: false, preview: false };
}

export function verifyOfflineCatalogue(data) {
  const catalogue = json(join(data, "catalogue.json"));
  assert.equal(
    new Set(catalogue.models.map((model) => model.id)).size,
    catalogue.models.length,
    "Unique model IDs",
  );
  const checked = new Set();
  for (const model of catalogue.models) {
    assert.match(model.id, /^[a-z0-9-]+$/);
    assert.ok(
      existsSync(join(data, "thumbnails", model.id + ".png")),
      model.id + ": local artwork",
    );
    const pack = json(join(data, "scenes", model.id + ".soma"));
    assert.equal(pack.config.model.id, model.id);
    for (const hash of Object.values(pack.buffers)) {
      assert.match(hash, /^[a-f0-9]{24}$/);
      if (!checked.has(hash)) {
        const bytes = readFileSync(join(data, "buffers", hash + ".soma"));
        assert.equal(
          createHash("sha256").update(bytes).digest("hex").slice(0, 24),
          hash,
          "Buffer checksum",
        );
        checked.add(hash);
      }
    }
  }
  for (const model of catalogue.models) {
    const config = offlineScene(data, model.id);
    if (model.kind !== "atlas") continue;
    const atlas = JSON.parse(
      Buffer.from(config.atlasPath.split(",")[1], "base64").toString("utf8"),
    );
    const raw = gunzipSync(
      Buffer.from(config.inlineAssets["scene.bin.gz"].split(",")[1], "base64"),
    );
    assert.equal(raw.length, atlas.chunks[0].bytes, model.id);
    assert.equal(
      atlas.parts.length,
      new Set(config.scene.groups.flatMap((group) => group.parts)).size,
      model.id,
    );
    for (const part of atlas.parts) {
      for (const [offset, length, alignment] of [
        [part.positions, part.vertexCount * 12, 4],
        [part.normals, part.vertexCount * 6, 2],
        [part.indices, part.indexCount * 4, 4],
      ]) {
        assert.equal(offset % alignment, 0, model.id);
        assert.ok(
          offset + length <= raw.length,
          `${model.id}: out-of-bounds geometry`,
        );
      }
    }
  }
  return { models: catalogue.models.length, buffers: checked.size };
}
