import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const frontend = resolve(root, "../Soma_Fe");
const output = resolve(root, "../soma_be/resources/mobile");
await mkdir(join(output, "models"), { recursive: true });
await mkdir(join(output, "viewer"), { recursive: true });
const files = [
  "hand_bones.glb",
  "heart_anatomy.glb",
  "lung_anatomy.glb",
  "liver_anatomy.glb",
  "brainstem_cranial_nerves.glb",
];
const manifest = [];
for (const filename of files) {
  const data = await readFile(join(frontend, "public/models", filename));
  await writeFile(join(output, "models", filename), data);
  manifest.push({
    filename,
    bytes: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
  });
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
  alias: {
    "@": join(frontend, "src"),
    three: join(root, "node_modules/three"),
  },
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
  JSON.stringify(
    {
      models: manifest,
      viewerSha256,
      source:
        "Soma_Fe/public/models; viewer materials: Soma_Fe/src/lib/anatomy/layers.ts",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Prepared ${files.length} models and bundled touch viewer in soma_be/resources/mobile.`,
);
