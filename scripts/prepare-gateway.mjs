import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(
    resolve(
      root,
      process.env.SOMA_BACKEND_MANIFEST ||
        "../soma_be/resources/mobile/manifest.json",
    ),
    "utf8",
  ),
);
const models = manifest.models.map(({ id }) => {
  if (!/^[a-z0-9-]+$/.test(id)) throw Error("Invalid model ID in manifest.");
  return { id };
});
if (
  !models.length ||
  new Set(models.map(({ id }) => id)).size !== models.length
)
  throw Error("Manifest must contain distinct model IDs.");
const assets = Object.fromEntries(
  Object.keys(manifest.assets).map((key) => {
    if (!/^[a-f0-9]{24}\.[a-z0-9]+$/.test(key))
      throw Error("Invalid asset key.");
    return [key, true];
  }),
);
mkdirSync(resolve(root, "deploy"), { recursive: true });
writeFileSync(
  resolve(root, "deploy/mobile-allowlist.json"),
  JSON.stringify({ models, assets }) + "\n",
);
console.log(
  `Gateway allowlist prepared: ${models.length} models, ${Object.keys(assets).length} assets; no source paths or document contents.`,
);
