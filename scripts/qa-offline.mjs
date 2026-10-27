import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { launchBrowser } = require("./qa-browser.cjs");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const data = join(root, "assets/offline");
const output = join(root, "qa/offline");
mkdirSync(output, { recursive: true });
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const catalogue = json(join(data, "catalogue.json"));
const js = readFileSync(join(data, "runtime.soma"), "utf8");
const template = readFileSync(join(data, "template.soma"), "utf8");
const helper = await build({ entryPoints: [join(root, "src/core/offlineDocument.ts")], bundle: true, write: false, format: "esm" });
const { createOfflineDocument } = await import("data:text/javascript;base64," + Buffer.from(helper.outputFiles[0].text).toString("base64"));
function scene(id) {
  const pack = json(join(data, "scenes", id + ".soma"));
  const inlineAssets = Object.fromEntries(Object.entries(pack.buffers).map(([key, hash]) => [key,
    "data:application/octet-stream;base64," + readFileSync(join(data, "buffers", hash + ".soma")).toString("base64")]));
  if (pack.config.model.kind === "glb") Object.assign(inlineAssets, json(join(data, "decoder.soma")));
  return { ...pack.config, inlineAssets, dark: false, preview: false };
}
for (const model of catalogue.models) {
  const config = scene(model.id);
  if (model.kind !== "atlas") continue;
  const atlas = JSON.parse(Buffer.from(config.atlasPath.split(",")[1], "base64").toString("utf8"));
  const raw = gunzipSync(Buffer.from(config.inlineAssets["scene.bin.gz"].split(",")[1], "base64"));
  assert.equal(raw.length, atlas.chunks[0].bytes, model.id);
  assert.equal(atlas.parts.length, new Set(config.scene.groups.flatMap((group) => group.parts)).size, model.id);
  for (const part of atlas.parts) {
    for (const [offset, length, alignment] of [[part.positions, part.vertexCount * 12, 4], [part.normals, part.vertexCount * 6, 2], [part.indices, part.indexCount * 4, 4]]) {
      assert.equal(offset % alignment, 0, model.id);
      assert.ok(offset + length <= raw.length, `${model.id}: out-of-bounds geometry`);
    }
  }
}
console.log(`PASS: ${catalogue.models.length} offline model configurations and geometry ranges`);
const browser = await launchBrowser();
const reports = [];
const representatives = process.env.SOMA_QA_ALL_MODELS === "1" ? catalogue.models.map((model) => model.id)
  : ["giai-phau-so", "giai-phau-gan", "giai-phau-tim", "ban-tay", "giai-phau-than", "he-thinh-giac", "tai-day-du"];
try {
  for (const id of representatives) {
    const context = await browser.newContext({ viewport: { width: 390, height: 520 }, offline: true });
    const page = await context.newPage(), errors = [], requests = [];
    page.on("pageerror", (error) => errors.push(error.stack || error.message));
    page.on("request", (request) => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
    const start = Date.now();
    await page.setContent(createOfflineDocument(scene(id), js, template), { waitUntil: "load" });
    await page.waitForFunction(() => window.somaMobileDebug?.().parts.length > 0 && document.querySelector("#status").hidden, null, { timeout: Number(process.env.SOMA_QA_TIMEOUT_MS || 30000) })
      .catch(async (error) => { throw Error(`${id}: ${JSON.stringify({ errors, status: await page.locator("#status").textContent() })}: ${error.message}`); });
    const initial = await page.evaluate(() => window.somaMobileDebug());
    const readyMs = Date.now() - start;
    const selectedId = initial.parts.find((part) => part.visible)?.id;
    assert.ok(selectedId, id);
    await page.evaluate((meshName) => window.somaMobileCommand({ type: "select", meshName }), selectedId);
    await page.mouse.move(195, 220); await page.mouse.down(); await page.mouse.move(280, 265, { steps: 12 }); await page.mouse.up();
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => window.somaMobileDebug());
    assert.notDeepEqual(after.camera.position, initial.camera.position, `${id}: drag changes camera`);
    assert.ok(after.rendered > 0, `${id}: renders anatomy`);
    assert.deepEqual(errors, [], id);
    assert.deepEqual(requests, [], `${id}: no backend or Internet request`);
    await page.screenshot({ path: join(output, id + ".png") });
    reports.push({ id, readyMs, structures: initial.parts.length, noNetwork: true });
    console.log(`PASS offline ${id}: ${readyMs} ms, ${initial.parts.length} structures, drag/select`);
    await context.close();
  }
  writeFileSync(join(output, "report.json"), JSON.stringify({ passed: true, at: new Date().toISOString(), configured: catalogue.models.length, reports }, null, 2));
} finally { await browser.close(); }
