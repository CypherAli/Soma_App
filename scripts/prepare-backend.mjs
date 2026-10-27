import { copyFile, mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join, extname } from "node:path";
import { createHash } from "node:crypto";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const frontend = resolve(root, "../Soma_Fe");
const output = resolve(root, "../soma_be/resources/mobile");
await mkdir(join(output, "assets"), { recursive: true });
await mkdir(join(output, "viewer"), { recursive: true });
const alias = {
  "@": join(frontend, "src"),
  three: join(root, "node_modules/three"),
};
const bundled = await build({
  entryPoints: [join(root, "scripts/export-catalogue.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  alias,
});
const { exportCatalogue } = await import(
  "data:text/javascript;base64," +
    Buffer.from(bundled.outputFiles[0].text).toString("base64")
);
const atlas = JSON.parse(
  await readFile(join(frontend, "public/human-atlas/atlas.json"), "utf8"),
);
const catalogue = exportCatalogue(atlas);
const assets = {};
const imported = new Map();
const types = {
  ".glb": "model/gltf-binary",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};
async function asset(data, extension, source) {
  const sha256 = createHash("sha256").update(data).digest("hex");
  const key = sha256.slice(0, 24) + extension;
  const destination = join(output, "assets", key);
  let unchanged = false;
  try {
    unchanged = (await stat(destination)).size === data.length;
  } catch {}
  if (!unchanged) await writeFile(destination, data);
  assets[key] = {
    file: `assets/${key}`,
    type: types[extension] ?? "application/octet-stream",
    bytes: data.length,
    sha256,
    source,
  };
  return key;
}
async function importAsset(source) {
  if (imported.has(source)) return imported.get(source);
  if (
    !/^\/(models|thumbnails|human-atlas)\/[a-zA-Z0-9_./-]+$/.test(source) ||
    source.split("/").includes("..")
  )
    throw Error(`Invalid source asset: ${source}`);
  const data = await readFile(join(frontend, "public", source));
  const key = await asset(data, extname(source), source);
  imported.set(source, key);
  return key;
}
for (const chunk of atlas.chunks) {
  chunk.url = await importAsset(`/human-atlas/${chunk.url.split("/").at(-1)}`);
  if (chunk.gzip)
    chunk.gzip = await importAsset(
      `/human-atlas/${chunk.gzip.split("/").at(-1)}`,
    );
}
const atlasKey = await asset(
  Buffer.from(JSON.stringify(atlas)),
  ".json",
  "/human-atlas/atlas.json",
);
for (const model of catalogue.models) {
  if (model.kind === "glb")
    model.asset = await importAsset(model.definition.modelFile);
  if (model.thumbnail) {
    try {
      model.thumbnailAsset = await importAsset(model.thumbnail);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}
for (const filename of [
  "draco_decoder.js",
  "draco_decoder.wasm",
  "draco_wasm_wrapper.js",
])
  await copyFile(
    join(frontend, "public/draco", filename),
    join(output, "viewer", filename),
  );
await build({
  entryPoints: [join(root, "viewer/runtime.ts")],
  outfile: join(output, "viewer/viewer.js"),
  bundle: true,
  minify: true,
  format: "esm",
  target: "chrome110",
  alias,
});
const viewerBytes = await readFile(join(output, "viewer/viewer.js"));
const viewerSha256 = createHash("sha256").update(viewerBytes).digest("hex");
const viewerTemplate = await readFile(join(root, "viewer/index.html"), "utf8");
await writeFile(
  join(output, "viewer/index.html"),
  viewerTemplate.replace(
    "../runtime/viewer.js",
    `../runtime/viewer.js?v=${viewerSha256.slice(0, 16)}`,
  ),
);
await writeFile(
  join(output, "manifest.json"),
  JSON.stringify({
    schemaVersion: 2,
    ...catalogue,
    assets,
    atlasKey,
    viewerSha256,
    source:
      "Soma_Fe catalogScenes / atlasScenes / sceneModules; original BodyParts3D and Z-Anatomy geometry",
  }) + "\n",
);
console.log(
  `Prepared ${catalogue.models.length} web models (${catalogue.models.filter((m) => m.kind === "atlas").length} atlas), ${Object.keys(assets).length} assets and touch viewer.`,
);

// Public source illustrations only; personal documents never enter the asset pack.
await mkdir(join(root, "../soma_be/resources/mobile/source-images"), {
  recursive: true,
});
const { readdir } = await import("node:fs/promises");
for (const key of await readdir(
  join(root, "../Soma_Fe/public/kb/dr-lam/images"),
)) {
  if (/^[a-f0-9]{20}\.webp$/.test(key))
    await copyFile(
      join(root, "../Soma_Fe/public/kb/dr-lam/images", key),
      join(root, "../soma_be/resources/mobile/source-images", key),
    );
}
