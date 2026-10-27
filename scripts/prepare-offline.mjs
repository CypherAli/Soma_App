import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve, join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { buildOfflineViewer } from "./lib/viewer-build.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const backend = join(root, "../soma_be");
const require = createRequire(import.meta.url);
const { MobileService } = require(
  join(backend, "dist/src/mobile/mobile.service.js"),
);
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
const manifest = readJson(join(backend, "resources/mobile/manifest.json"));
const documents = readJson(
  join(backend, "resources/cms/catalog.json"),
).documents;
// Reproducible public, source-controlled content. No accounts or DB secrets enter the bundle.
const service = new MobileService(
  {
    definitions: new Map(documents.map((doc) => [doc.id, doc])),
    snapshot: async () => ({ documents: {} }),
  },
  {},
  {},
  {},
  {
    get: (key) =>
      key === "MOBILE_ASSETS_DIR"
        ? join(backend, "resources/mobile")
        : undefined,
  },
);
const output = join(root, "assets/offline");
mkdirSync(join(output, "scenes"), { recursive: true });
mkdirSync(join(output, "thumbnails"), { recursive: true });
mkdirSync(join(output, "buffers"), { recursive: true });
const readAsset = (key) =>
  readFileSync(join(backend, "resources/mobile", manifest.assets[key].file));
const atlas = JSON.parse(readAsset(manifest.atlasKey).toString("utf8"));
const chunks = new Map();
const dataUri = (data, type = "application/octet-stream") =>
  `data:${type};base64,${Buffer.from(data).toString("base64")}`;
const registry = [],
  art = [],
  buffersRegistry = new Map();
const renderedFile = join(output, "thumbnails/manifest.json");
const rendered = existsSync(renderedFile) ? readJson(renderedFile) : {};
let total = 0;
const catalogue = await service.bootstrap();
function saveBuffer(data) {
  const hash = createHash("sha256").update(data).digest("hex").slice(0, 24);
  if (!buffersRegistry.has(hash)) {
    writeFileSync(join(output, "buffers", `${hash}.soma`), data);
    buffersRegistry.set(hash, data.length);
  }
  return hash;
}
writeFileSync(join(output, "catalogue.json"), JSON.stringify(catalogue));
for (const model of catalogue.models) {
  const html = await service.viewer(model.id);
  const match = html.match(/window\.SOMA_VIEWER_CONFIG=(\{[^\n]*\});/);
  if (!match) throw Error(`Missing config for ${model.id}`);
  const config = JSON.parse(match[1]);
  const inlineAssets = {};
  config.resourceBase = `https://offline.soma.local/api/mobile/viewer/${model.id}`;
  if (model.kind === "atlas") {
    const ids = new Set(config.scene.groups.flatMap((group) => group.parts));
    const source = atlas.parts.filter((part) => ids.has(part.id));
    if (source.length !== ids.size)
      throw Error(`Missing geometry for ${model.id}`);
    const buffers = [],
      compact = [];
    let offset = 0;
    function append(buffer) {
      const padding = (4 - (offset % 4)) % 4;
      if (padding) {
        buffers.push(Buffer.alloc(padding));
        offset += padding;
      }
      const start = offset;
      buffers.push(buffer);
      offset += buffer.length;
      return start;
    }
    for (const part of source) {
      if (!chunks.has(part.chunk))
        chunks.set(part.chunk, readAsset(atlas.chunks[part.chunk].url));
      const bytes = chunks.get(part.chunk);
      compact.push({
        ...part,
        chunk: 0,
        positions: append(
          bytes.subarray(
            part.positions,
            part.positions + part.vertexCount * 12,
          ),
        ),
        normals: append(
          bytes.subarray(part.normals, part.normals + part.vertexCount * 6),
        ),
        indices: append(
          bytes.subarray(part.indices, part.indices + part.indexCount * 4),
        ),
      });
    }
    const raw = Buffer.concat(buffers);
    inlineAssets["scene.bin.gz"] = saveBuffer(gzipSync(raw, { level: 9 }));
    // Raw fallback is unnecessary: supported Android WebView versions have DecompressionStream.
    const compactAtlas = {
      version: atlas.version,
      parts: compact,
      chunks: [
        { url: "scene.bin.gz", gzip: "scene.bin.gz", bytes: raw.length },
      ],
    };
    config.atlasPath = dataUri(
      JSON.stringify(compactAtlas),
      "application/json",
    );
  } else {
    const target = manifest.models.find((item) => item.id === model.id);
    inlineAssets["model.glb"] = saveBuffer(readAsset(target.asset));
    config.modelPath = "../assets/model.glb";
  }
  const pack = JSON.stringify({ config, buffers: inlineAssets }).replace(
    /</g,
    "\\u003c",
  );
  writeFileSync(join(output, "scenes", `${model.id}.soma`), pack);
  registry.push(
    `${JSON.stringify(model.id)}: require("../../assets/offline/scenes/${model.id}.soma")`,
  );
  total += Buffer.byteLength(pack);
  const target = manifest.models.find((item) => item.id === model.id);
  if (
    rendered[model.id] === createHash("sha256").update(pack).digest("hex") &&
    existsSync(join(output, "thumbnails", model.id + ".png"))
  ) {
    art.push(
      `${JSON.stringify(model.id)}: require("../../assets/offline/thumbnails/${model.id}.png")`,
    );
  } else if (target.thumbnailAsset) {
    const filename =
      model.id + extname(manifest.assets[target.thumbnailAsset].file);
    copyFileSync(
      join(
        backend,
        "resources/mobile",
        manifest.assets[target.thumbnailAsset].file,
      ),
      join(output, "thumbnails", filename),
    );
    art.push(
      `${JSON.stringify(model.id)}: require("../../assets/offline/thumbnails/${filename}")`,
    );
  }
}
const decoder = Object.fromEntries(
  ["draco_decoder.js", "draco_wasm_wrapper.js", "draco_decoder.wasm"].map(
    (name) => [
      name,
      dataUri(
        readFileSync(join(backend, "resources/mobile/viewer", name)),
        name.endsWith(".wasm") ? "application/wasm" : "text/javascript",
      ),
    ],
  ),
);
writeFileSync(join(output, "decoder.soma"), JSON.stringify(decoder));
await buildOfflineViewer(root);
writeFileSync(
  join(root, "src/core/offlineRegistry.ts"),
  `/* eslint-disable @typescript-eslint/no-require-imports -- Metro requires literal asset imports. */\n// Generated by npm run prepare:offline. Public anatomy assets only.\nexport const OFFLINE_MODELS: Record<string, number> = {\n${registry.join(",\n")}\n};\nexport const OFFLINE_BUFFERS: Record<string, number> = {\n${[...buffersRegistry.keys()].map((hash) => `${JSON.stringify(hash)}: require("../../assets/offline/buffers/${hash}.soma")`).join(",\n")}\n};\n`,
);
writeFileSync(
  join(root, "src/ui/offlineArt.ts"),
  `// Generated by npm run prepare:offline.\nexport const OFFLINE_ART = {\n${art.join(",\n")}\n};\n`,
);
console.log(
  `Offline: ${catalogue.models.length} models, ${catalogue.questions.length} questions, ${art.length} thumbnails, ${buffersRegistry.size} shared buffers, ${((total + [...buffersRegistry.values()].reduce((a, b) => a + b, 0)) / 1048576).toFixed(1)} MB before APK compression.`,
);
