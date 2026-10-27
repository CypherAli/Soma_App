import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  offlineScene,
  verifyOfflineCatalogue,
} from "./lib/offline-catalogue.mjs";
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
const helper = await build({
  entryPoints: [join(root, "src/core/offlineDocument.ts")],
  bundle: true,
  write: false,
  format: "esm",
});
const { createOfflineDocument } = await import(
  "data:text/javascript;base64," +
    Buffer.from(helper.outputFiles[0].text).toString("base64")
);
const protocol = await build({
  entryPoints: [join(root, "src/components/viewerProtocol.ts")],
  bundle: true,
  write: false,
  format: "esm",
});
const { parseViewerEvent } = await import(
  "data:text/javascript;base64," +
    Buffer.from(protocol.outputFiles[0].text).toString("base64")
);
const scene = (id) => offlineScene(data, id);
const integrity = verifyOfflineCatalogue(data);
console.log(
  `PASS: ${integrity.models} offline model configurations and geometry ranges, ${integrity.buffers} buffer checksums`,
);

let browser = await launchBrowser();
const reports = [];
const representatives =
  process.env.SOMA_QA_ALL_MODELS === "1"
    ? catalogue.models.map((model) => model.id)
    : [
        "giai-phau-so",
        "giai-phau-gan",
        "giai-phau-tim",
        "ban-tay",
        "giai-phau-than",
        "he-thinh-giac",
        "tai-day-du",
      ];
try {
  for (const id of representatives) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 520 },
      offline: true,
    });
    const page = await context.newPage(),
      errors = [],
      requests = [];
    page.on("pageerror", (error) => errors.push(error.stack || error.message));
    page.on("request", (request) => {
      if (/^https?:/.test(request.url())) requests.push(request.url());
    });
    await page.exposeFunction("validateViewerEvent", (value) => {
      assert.ok(
        parseViewerEvent(value),
        `${id}: real runtime payload matches app protocol`,
      );
    });
    await page.evaluate(() => {
      window.ReactNativeWebView = {
        postMessage(raw) {
          const event = JSON.parse(raw);
          void window.validateViewerEvent(event).then(() => {
            if (event.type === "ready") window.viewerReadyValidated = true;
          });
        },
      };
    });
    const start = Date.now();
    await page.setContent(createOfflineDocument(scene(id), js, template), {
      waitUntil: "load",
    });
    await page
      .waitForFunction(
        () =>
          window.somaMobileDebug?.().parts.length > 0 &&
          document.querySelector("#status").hidden,
        null,
        { timeout: Number(process.env.SOMA_QA_TIMEOUT_MS || 30000) },
      )
      .catch(async (error) => {
        throw Error(
          `${id}: ${JSON.stringify({ errors, status: await page.locator("#status").textContent() })}: ${error.message}`,
        );
      });
    const initial = await page.evaluate(() => window.somaMobileDebug());
    await page.waitForFunction(() => window.viewerReadyValidated === true);
    const readyMs = Date.now() - start;
    const selectedId = initial.parts.find((part) => part.visible)?.id;
    assert.ok(selectedId, id);
    await page.evaluate(
      (meshName) => window.somaMobileCommand({ type: "select", meshName }),
      selectedId,
    );
    await page.mouse.move(195, 220);
    await page.mouse.down();
    await page.mouse.move(280, 265, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => window.somaMobileDebug());
    assert.notDeepEqual(
      after.camera.position,
      initial.camera.position,
      `${id}: drag changes camera`,
    );
    assert.ok(after.rendered > 0, `${id}: renders anatomy`);
    assert.deepEqual(errors, [], id);
    assert.deepEqual(requests, [], `${id}: no backend or Internet request`);
    await page.screenshot({ path: join(output, id + ".png") });
    reports.push({
      id,
      readyMs,
      structures: initial.parts.length,
      noNetwork: true,
    });
    console.log(
      `PASS offline ${id}: ${readyMs} ms, ${initial.parts.length} structures, drag/select`,
    );
    await context.close();
    // Software WebGL drivers can retain GPU allocations across destroyed contexts.
    // Recycle the isolated QA browser in small batches to keep memory bounded.
    if (reports.length % 4 === 0 && reports.length < representatives.length) {
      await browser.close();
      browser = await launchBrowser();
    }
  }
  writeFileSync(
    join(output, "report.json"),
    JSON.stringify(
      {
        passed: true,
        at: new Date().toISOString(),
        configured: catalogue.models.length,
        reports,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
