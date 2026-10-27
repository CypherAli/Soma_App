import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { launchBrowser } = require("./qa-browser.cjs");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const data = join(root, "assets/offline");
const json = (file) => JSON.parse(readFileSync(file, "utf8"));
const catalogue = json(join(data, "catalogue.json"));
const runtime = readFileSync(join(data, "runtime.soma"), "utf8");
const template = readFileSync(join(data, "template.soma"), "utf8");
const helper = await build({ entryPoints: [join(root, "src/core/offlineDocument.ts")], bundle: true, write: false, format: "esm" });
const { createOfflineDocument } = await import("data:text/javascript;base64," + Buffer.from(helper.outputFiles[0].text).toString("base64"));
const browser = await launchBrowser();
const rendered = {}, art = [];
try {
  for (const model of catalogue.models) {
    const packText = readFileSync(join(data, "scenes", model.id + ".soma"), "utf8");
    const pack = JSON.parse(packText);
    const inlineAssets = Object.fromEntries(Object.entries(pack.buffers).map(([key, hash]) => [key,
      "data:application/octet-stream;base64," + readFileSync(join(data, "buffers", hash + ".soma")).toString("base64")]));
    if (model.kind === "glb") Object.assign(inlineAssets, json(join(data, "decoder.soma")));
    const page = await browser.newPage({ viewport: { width: 480, height: 360 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setContent(createOfflineDocument({ ...pack.config, inlineAssets, transparent: true, preview: false, dark: false }, runtime, template));
    await page.waitForFunction(() => window.somaMobileDebug?.().parts.length > 0 && document.querySelector("#status").hidden, null, { timeout: 30000 });
    if (model.id === "giai-phau-so") {
      await page.evaluate(() => window.somaMobileCommand({ type: "view", view: "three-quarter" }));
      await page.waitForTimeout(150);
    }
    if (errors.length) throw Error(`${model.id}: ${errors.join(", ")}`);
    await page.screenshot({ path: join(data, "thumbnails", model.id + ".png"), omitBackground: true });
    await page.close();
    rendered[model.id] = createHash("sha256").update(packText).digest("hex");
    art.push(`${JSON.stringify(model.id)}: require("../../assets/offline/thumbnails/${model.id}.png")`);
    console.log(`Rendered ${art.length}/${catalogue.models.length}: ${model.id}`);
  }
  writeFileSync(join(data, "thumbnails/manifest.json"), JSON.stringify(rendered));
  writeFileSync(join(root, "src/ui/offlineArt.ts"), `// Generated from real anatomy by npm run prepare:thumbnails.\nexport const OFFLINE_ART = {\n${art.join(",\n")}\n};\n`);
  mkdirSync(join(root, "qa/redesign"), { recursive: true });
  writeFileSync(join(root, "qa/redesign/thumbnails-report.json"), JSON.stringify({ passed: true, rendered: art.length, at: new Date().toISOString(), transparent: true }));
} finally { await browser.close(); }
