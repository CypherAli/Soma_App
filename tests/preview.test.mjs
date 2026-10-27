import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { once } from "node:events";
import { createPreviewServer } from "../scripts/lib/preview-server.mjs";

test("preview serves SPA routes, assets and HEAD; blocks traversal, malformed paths and writes", async () => {
  const workspace = await mkdtemp(join(tmpdir(), "soma-preview-test-"));
  const root = join(workspace, "public");
  await mkdir(root);
  await writeFile(join(root, "index.html"), "<main>Soma fixture</main>");
  await writeFile(join(root, "app.js"), "window.fixture = true;");
  await writeFile(join(workspace, "secret.txt"), "fixture outside public root");
  const metadata = join(root, "soma-preview.json");
  await writeFile(metadata, JSON.stringify({ builtAt: "first" }));
  const server = createPreviewServer(root).listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const route = await fetch(base + "/atlas/mat-cat-ngang-bung");
    assert.equal(route.status, 200);
    assert.match(await route.text(), /Soma fixture/);
    const asset = await fetch(base + "/app.js");
    assert.match(asset.headers.get("content-type"), /javascript/);
    assert.equal(asset.headers.get("x-content-type-options"), "nosniff");
    const head = await fetch(base + "/app.js", { method: "HEAD" });
    assert.equal(await head.text(), "");
    assert.equal(
      head.headers.get("content-length"),
      String(Buffer.byteLength("window.fixture = true;")),
    );
    assert.equal((await fetch(base + "/missing.png")).status, 404);
    assert.equal((await fetch(base + "/%2e%2e%2fsecret.txt")).status, 403);
    assert.equal((await fetch(base + "/%invalid")).status, 400);
    assert.equal((await fetch(base + "/", { method: "POST" })).status, 405);
    assert.equal(
      (await fetch(base + "/_soma/health").then((r) => r.json())).builtAt,
      "first",
    );
    await writeFile(metadata, JSON.stringify({ builtAt: "updated" }));
    assert.equal(
      (await fetch(base + "/_soma/health").then((r) => r.json())).builtAt,
      "updated",
    );
  } finally {
    server.closeAllConnections();
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await rm(workspace, { recursive: true, force: true });
  }
});
