import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { build } from "esbuild";

export async function buildOfflineViewer(root, { check = false } = {}) {
  const output = join(root, "assets/offline");
  const result = await build({
    entryPoints: [join(root, "viewer/runtime.ts")],
    bundle: true,
    minify: true,
    format: "iife",
    target: "chrome110",
    write: false,
    alias: { three: join(root, "node_modules/three") },
    define: {
      "import.meta.url": JSON.stringify(
        "https://offline.soma.local/api/mobile/runtime/viewer.js",
      ),
    },
  });
  const files = [
    [join(output, "runtime.soma"), result.outputFiles[0].contents],
    [
      join(output, "template.soma"),
      await readFile(join(root, "viewer/index.html")),
    ],
  ];
  for (const [file, bytes] of files) {
    if (check)
      assert.equal(
        (await readFile(file, "utf8")).replace(/\r\n/g, "\n"),
        Buffer.from(bytes).toString("utf8").replace(/\r\n/g, "\n"),
        "Bundled viewer is stale: run npm run viewer:build",
      );
    else await writeFile(file, bytes);
  }
}
