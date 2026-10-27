const { launchBrowser } = require("./qa-browser.cjs");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
(async () => {
  const browser = await launchBrowser();
  const output = path.resolve(__dirname, "../qa/viewer");
  const api = process.env.MOBILE_QA_API_URL || "http://localhost:4000/api";
  fs.mkdirSync(output, { recursive: true });
  const catalog = await fetch(api + "/mobile/bootstrap").then((r) => r.json());
  const report = [];
  try {
    for (const model of catalog.models) {
      const page = await browser.newPage({
        viewport: { width: 400, height: 400 },
      });
      const errors = [];
      page.on("pageerror", (e) => {
        errors.push(e.message);
        console.error(model.id, e.message);
      });
      page.on("console", (m) => {
        if (m.type() === "error") {
          errors.push(m.text());
          console.error(model.id, m.text().slice(0, 600));
        }
      });
      page.on("response", (response) => {
        if (response.status() >= 400)
          errors.push(`HTTP ${response.status()}: ${response.url()}`);
      });
      await page.addInitScript(() => {
        window.__events = [];
        window.ReactNativeWebView = {
          postMessage: (value) => window.__events.push(JSON.parse(value)),
        };
      });
      await page.goto(api + model.viewerPath);
      await page.waitForFunction(
        () =>
          window.__events.some((e) => e.type === "ready" || e.type === "error"),
        undefined,
        { timeout: 45000 },
      );
      const events = await page.evaluate(() => window.__events);
      const ready = events.find((e) => e.type === "ready");
      assert.ok(ready, JSON.stringify(events));
      assert.ok(ready.structures.length > 0);
      const note = model.structures[0];
      await page.evaluate(
        (meshName) => window.somaMobileCommand({ type: "select", meshName }),
        note.meshName,
      );
      const selected = await page.evaluate(() =>
        window.__events.filter((e) => e.type === "selected").at(-1),
      );
      assert.equal(selected.structure.label, note.label);
      await page
        .locator("canvas")
        .screenshot({ path: path.join(output, model.id + ".png") });
      assert.deepEqual(errors, []);
      report.push({
        model: model.id,
        meshes: ready.structures.length,
        groups: ready.groups.length,
        selection: true,
      });
      await page.close();
    }
    fs.writeFileSync(
      path.join(output, "report.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      `PASS: all ${catalog.models.length} shared models rendered and selected real structures.`,
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e.stack);
  process.exit(1);
});
