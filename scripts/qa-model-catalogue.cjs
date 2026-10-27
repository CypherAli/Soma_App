const { createServer } = require("node:http");
const {
  readFileSync,
  mkdirSync,
  writeFileSync,
  existsSync,
} = require("node:fs");
const { resolve, join } = require("node:path");
const { createHash } = require("node:crypto");
const assert = require("node:assert/strict");
const { launchBrowser } = require("./qa-browser.cjs");
const backend = resolve(__dirname, "../../soma_be");
const { MobileService } = require(
  join(backend, "dist/src/mobile/mobile.service"),
);
const source = JSON.parse(
  readFileSync(join(backend, "resources/cms/catalog.json"), "utf8"),
);
const manifest = JSON.parse(
  readFileSync(join(backend, "resources/mobile/manifest.json"), "utf8"),
);
const content = {
  definitions: new Map(source.documents.map((doc) => [doc.id, doc])),
  snapshot: async () => ({ documents: {} }),
};
const service = new MobileService(
  content,
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
const output = resolve(__dirname, "../qa/models-1.0.5");
mkdirSync(output, { recursive: true });

const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;
  try {
    let data,
      type = "application/json";
    if (path === "/api/mobile/bootstrap")
      data = JSON.stringify(await service.bootstrap());
    else if (/^\/api\/mobile\/viewer\/[a-z0-9-]+$/.test(path)) {
      data = await service.viewer(
        path.split("/").at(-1),
        url.searchParams.get("theme") === "dark",
      );
      type = "text/html";
    } else if (/^\/api\/mobile\/assets\/[^/]+$/.test(path)) {
      const asset = service.asset(path.split("/").at(-1));
      data = asset.data;
      type = asset.type;
    } else if (/^\/api\/mobile\/runtime\/[^/]+$/.test(path)) {
      const file = path.split("/").at(-1);
      if (
        ![
          "viewer.js",
          "draco_decoder.js",
          "draco_decoder.wasm",
          "draco_wasm_wrapper.js",
        ].includes(file)
      )
        throw Error("Unknown runtime");
      data = service.readAsset(`viewer/${file}`);
      type = file.endsWith(".wasm") ? "application/wasm" : "text/javascript";
    } else if (/^\/api\/mobile\/models\/[a-z0-9-]+\/file$/.test(path)) {
      data = await service.modelFile(path.split("/").at(-2));
      type = "model/gltf-binary";
    } else if (path === "/favicon.ico") {
      res.writeHead(204).end();
      return;
    } else if (process.env.MOBILE_QA_UI === "1" && !path.startsWith("/api/")) {
      const root = resolve(__dirname, "../dist");
      let file = resolve(root, "." + decodeURIComponent(path));
      if (file !== root && !file.startsWith(root + require("node:path").sep)) {
        res.writeHead(404).end();
        return;
      }
      if (!existsSync(file) || !require("node:fs").statSync(file).isFile())
        file = join(root, "index.html");
      data = readFileSync(file);
      type =
        {
          ".js": "text/javascript",
          ".css": "text/css",
          ".png": "image/png",
          ".ttf": "font/ttf",
          ".ico": "image/x-icon",
        }[require("node:path").extname(file)] || "text/html";
    } else {
      res.writeHead(404).end();
      return;
    }
    res
      .writeHead(200, {
        "Content-Type": type,
        "X-Content-Type-Options": "nosniff",
      })
      .end(data);
  } catch (error) {
    res.writeHead(error.getStatus?.() || 500).end(String(error.message));
  }
});

(async () => {
  const catalogue = await service.bootstrap();
  assert.equal(
    catalogue.schemaVersion,
    2,
    "Older apps must not consume the expanded viewer contract",
  );
  assert.deepEqual(
    catalogue.models.map((model) => model.id),
    manifest.models.map((model) => model.id),
  );
  assert.ok(catalogue.models.length > 5);
  const atlas = JSON.parse(service.asset(manifest.atlasKey).data);
  const ids = new Set(atlas.parts.map((part) => part.id));
  for (const target of manifest.models.filter(
    (model) => model.kind === "atlas",
  )) {
    assert.ok(target.definition.groups.length, target.id);
    for (const id of target.definition.groups.flatMap((group) => group.parts))
      assert.ok(ids.has(id), `${target.id}: missing original geometry ${id}`);
    const html = await service.viewer(target.id);
    assert.ok(html.includes("window.SOMA_VIEWER_CONFIG="));
    if (target.definition.groups.some((group) => group.landmarks?.length))
      assert.ok(
        html.includes("landmarks"),
        `${target.id}: retain web surface landmarks`,
      );
  }
  for (const [key, info] of Object.entries(manifest.assets)) {
    const data = service.asset(key).data;
    assert.equal(data.length, info.bytes);
    assert.equal(
      createHash("sha256").update(data).digest("hex"),
      info.sha256,
      `Original asset checksum: ${key}`,
    );
  }
  assert.throws(() => service.asset("../manifest.json"));
  assert.throws(() => service.asset("__proto__"));
  assert.throws(() => service.readAsset("../cms/catalog.json"));
  console.log(
    `PASS ${catalogue.models.length} shared models, ${catalogue.questions.length} practice questions, all original atlas IDs and ${Object.keys(manifest.assets).length} asset checksums`,
  );
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const browser = await launchBrowser();
  const reports = [];
  try {
    const representatives = [
      ...new Set(
        [
          "giai-phau-tim",
          "ban-tay",
          "giai-phau-so",
          "mat-cat-ngang-bung",
          manifest.models.find((model) => model.definition.layers?.length)?.id,
          ...manifest.models
            .filter((model) => model.kind === "glb")
            .map((model) => model.id),
        ].filter(Boolean),
      ),
    ];
    for (const id of process.env.MOBILE_QA_UI_ONLY === "1"
      ? []
      : representatives) {
      const page = await browser.newPage({
        viewport: { width: 390, height: 480 },
        deviceScaleFactor: 3,
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript(() => {
        window.__events = [];
        window.ReactNativeWebView = {
          postMessage: (value) => window.__events.push(JSON.parse(value)),
        };
      });
      await page.goto(`${base}/mobile/viewer/${id}`);
      await page.waitForFunction(
        () =>
          window.__events.some(
            (event) => event.type === "ready" || event.type === "error",
          ),
        null,
        { timeout: 90000 },
      );
      const ready = await page.evaluate(() =>
        window.__events.find((event) => event.type === "ready"),
      );
      assert.ok(
        ready,
        `${id}: ${JSON.stringify(await page.evaluate(() => window.__events))}`,
      );
      assert.ok(ready.structures.length > 0);
      const quality = await page.evaluate(
        () => window.somaMobileDebug().quality,
      );
      assert.equal(
        quality.pixelRatio,
        2,
        `${id}: render at high density on Retina screens`,
      );
      assert.equal(
        quality.antialias,
        true,
        `${id}: hardware edge antialiasing`,
      );
      if (id === "ban-tay")
        assert.deepEqual(ready.state.availableSides, ["left"]);
      await page.screenshot({ path: join(output, `${id}-assembled.png`) });
      const initialCamera = await page.evaluate(
        () => window.somaMobileDebug().camera,
      );
      // Exercise the same pointer path used by touch OrbitControls, not a rotation command.
      const touch = await page.context().newCDPSession(page);
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: 180, y: 230 }],
      });
      for (let x = 190; x <= 270; x += 10)
        await touch.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x, y: 230 }],
        });
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await page.waitForFunction(
        (initial) =>
          JSON.stringify(window.somaMobileDebug().camera.quaternion) !==
          JSON.stringify(initial),
        initialCamera.quaternion,
      );
      const distanceBeforePinch = await page.evaluate(() => {
        const { position, target } = window.somaMobileDebug().camera;
        return Math.hypot(
          ...position.map((value, index) => value - target[index]),
        );
      });
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: 140, y: 230 },
          { x: 240, y: 230 },
        ],
      });
      for (let offset = 10; offset <= 40; offset += 10)
        await touch.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [
            { x: 140 - offset, y: 230 },
            { x: 240 + offset, y: 230 },
          ],
        });
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await page.waitForFunction((before) => {
        const { position, target } = window.somaMobileDebug().camera;
        return (
          Math.hypot(...position.map((value, index) => value - target[index])) <
          before * 0.99
        );
      }, distanceBeforePinch);
      await touch.detach();
      await page.screenshot({ path: join(output, `${id}-rotated.png`) });
      await page.evaluate(() => window.somaMobileCommand({ type: "reset" }));
      const result = await page.evaluate(async () => {
        const command = window.somaMobileCommand;
        const settle = async () => {
          await new Promise(requestAnimationFrame);
          await new Promise(requestAnimationFrame);
        };
        const ready = window.__events.find((event) => event.type === "ready");
        const baseline = window.somaMobileDebug();
        command({ type: "explode", amount: 1 });
        await settle();
        const separated = window.somaMobileDebug();
        command({ type: "explode", amount: 0 });
        await settle();
        const assembled = window.somaMobileDebug();
        const structure =
          ready.structures.find(
            (item) => item.kind === "group" && item.meshNames.length > 1,
          ) || ready.structures[0];
        command({ type: "select", meshName: structure.meshName });
        command({ type: "isolate", enabled: true });
        await settle();
        const isolated = window.somaMobileDebug();
        command({ type: "isolate", enabled: false });
        command({ type: "fade", enabled: true });
        const faded = window.somaMobileDebug().state;
        command({ type: "hide", enabled: true });
        const hidden = window.somaMobileDebug();
        command({ type: "hide", enabled: false });
        command({ type: "clip", enabled: true, axis: "x", percent: 40 });
        await settle();
        const clipped = window.somaMobileDebug().state;
        command({ type: "restore" });
        await settle();
        const restored = window.somaMobileDebug();
        command({ type: "explode", amount: 1 });
        await settle();
        return {
          baseline,
          separated,
          assembled,
          structure,
          isolated,
          faded,
          hidden,
          clipped,
          restored,
          selected: window.__events
            .filter((event) => event.type === "selected")
            .find((event) => event.structure)?.structure,
        };
      });
      assert.ok(
        result.separated.parts.some((part, index) =>
          part.position.some(
            (value, axis) =>
              Math.abs(value - result.baseline.parts[index].position[axis]) >
              0.001,
          ),
        ),
        `${id}: structures actually move`,
      );
      assert.deepEqual(
        result.assembled.parts.map((part) => part.position),
        result.baseline.parts.map((part) => part.position),
        `${id}: exact reversible geometry transforms`,
      );
      const selectedIds = new Set(
        result.structure.meshNames || [result.structure.meshName],
      );
      assert.ok(
        result.isolated.parts.filter((part) => part.visible).length > 0,
      );
      assert.ok(
        result.isolated.parts
          .filter((part) => part.visible)
          .every((part) => selectedIds.has(part.id)),
      );
      assert.equal(result.faded.selectedFaded, true);
      assert.ok(
        result.hidden.parts
          .filter((part) => selectedIds.has(part.id))
          .every((part) => !part.visible),
      );
      assert.equal(result.clipped.clip.enabled, true);
      assert.equal(result.restored.state.explode, 0);
      assert.equal(result.restored.state.isolate, false);
      assert.equal(result.restored.state.hiddenCount, 0);
      assert.equal(result.restored.state.clip.enabled, false);
      assert.equal(result.selected.label, result.structure.label);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: join(output, `${id}-separated.png`) });
      reports.push({
        id,
        structures: ready.structures.length,
        layers: ready.groups.length,
        originalGeometry: true,
        separation: true,
        reassembly: true,
        isolation: true,
        hideFade: true,
        clip: true,
        touchRotation: true,
        pinchZoom: true,
        quality,
      });
      console.log(
        "PASS touch viewer",
        id,
        ready.structures.length,
        "structures",
      );
      await page.close();
    }
    if (process.env.MOBILE_QA_UI === "1") {
      const page = await browser.newPage({
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.addInitScript((base) => {
        localStorage.setItem(
          "soma.preferences.v1",
          JSON.stringify({ apiUrl: base, appearance: "dark" }),
        );
        window.__viewerEvents = [];
        addEventListener("message", (event) => {
          if (event.data?.source === "soma-mobile-viewer")
            window.__viewerEvents.push(event.data);
        });
      }, base);
      const origin = new URL(base).origin;
      await page.goto(origin);
      await page.waitForFunction(
        () =>
          document.querySelector("iframe")?.contentWindow?.somaMobileDebug?.()
            .preview === true,
        null,
        { timeout: 60000 },
      );
      await page.waitForFunction(
        () => window.__viewerEvents.some((event) => event.type === "ready"),
        null,
        { timeout: 60000 },
      );
      const initialPreview = await page.evaluate(() =>
        document.querySelector("iframe").contentWindow.somaMobileDebug(),
      );
      await page.waitForFunction((initial) => {
        const debug = document
          .querySelector("iframe")
          .contentWindow.somaMobileDebug();
        return (
          debug.autoRotate &&
          Math.abs(debug.camera.position[0] - initial[0]) > 0.02
        );
      }, initialPreview.camera.position);
      await page.screenshot({ path: join(output, "mobile-home-3d.png") });
      const previewFrame = page
        .frames()
        .find((frame) => frame.url().includes("preview=1"));
      const canvasBox = await previewFrame.locator("canvas").boundingBox();
      const beforeDrag = await previewFrame.evaluate(
        () => window.somaMobileDebug().camera.quaternion,
      );
      await page.mouse.move(
        canvasBox.x + canvasBox.width * 0.4,
        canvasBox.y + canvasBox.height * 0.5,
      );
      await page.mouse.down();
      await page.mouse.move(
        canvasBox.x + canvasBox.width * 0.7,
        canvasBox.y + canvasBox.height * 0.5,
        { steps: 8 },
      );
      await page.mouse.up();
      await previewFrame.waitForFunction((before) => {
        const debug = window.somaMobileDebug();
        return (
          !debug.autoRotate &&
          JSON.stringify(debug.camera.quaternion) !== JSON.stringify(before)
        );
      }, beforeDrag);
      await page.getByRole("button", { name: "Mở Atlas", exact: true }).click();
      await page.waitForFunction(
        () => !document.querySelector('iframe[src*="preview=1"]'),
      );
      console.log(
        "PASS home: centered live 3D, automatic rotation, drag rotation and preview unmounted on navigation",
      );
      await page.goto(`${origin}/atlas/mat-cat-ngang-bung`);
      await page.waitForFunction(
        () => window.__viewerEvents.some((event) => event.type === "ready"),
        null,
        { timeout: 60000 },
      );
      await page.screenshot({ path: join(output, "mobile-abdomen.png") });
      await page.goto(`${origin}/atlas/giai-phau-tim`);
      await page.waitForFunction(
        () => window.__viewerEvents.some((event) => event.type === "ready"),
        null,
        { timeout: 60000 },
      );
      await page
        .getByRole("button", { name: "Tách mô hình", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Tách 100%", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          document.querySelector("iframe")?.contentWindow?.somaMobileDebug?.()
            .state.explode === 1,
      );
      await page.screenshot({ path: join(output, "mobile-tools.png") });
      await page
        .getByRole("button", { name: "Đóng bảng thông tin", exact: true })
        .click();
      await page.getByRole("dialog").waitFor({ state: "hidden" });
      await page.screenshot({ path: join(output, "mobile-separated.png") });
      const ready = await page.evaluate(() =>
        window.__viewerEvents.find((event) => event.type === "ready"),
      );
      await page
        .getByRole("button", {
          name: `Cấu trúc (${ready.structures.length})`,
          exact: true,
        })
        .click();
      await page
        .getByText(ready.structures[0].label, { exact: true })
        .last()
        .click();
      await page
        .getByRole("button", { name: "Chi tiết cấu trúc", exact: true })
        .click();
      if (ready.structures[0].note)
        await page
          .getByRole("dialog")
          .getByText(ready.structures[0].note, { exact: true })
          .waitFor();
      await page.screenshot({ path: join(output, "mobile-details.png") });
      await page
        .getByRole("button", { name: "Đóng bảng thông tin", exact: true })
        .click();
      const loadCount = await page.evaluate(
        () =>
          window.__viewerEvents.filter((event) => event.type === "ready")
            .length,
      );
      assert.equal(
        loadCount,
        1,
        "Opening controls, separating and reading detail must not reload the 3D viewer",
      );
      await page.goto(`${origin}/atlas`);
      await page.getByLabel("Tìm trong Atlas", { exact: true }).fill("Liver");
      const liver = catalogue.models.find(
        (model) => model.id === "giai-phau-gan",
      );
      await page
        .getByRole("button", { name: `Mở ${liver.title}`, exact: true })
        .waitFor();
      await page.screenshot({ path: join(output, "mobile-library.png") });
      assert.deepEqual(errors, []);
      console.log(
        "PASS mobile UI: shared library search, native separation controls, structure details and stable 3D viewer",
      );
      await page.close();
    }
    // A focused UI rerun keeps the geometry audit from the full run.
    const previous = existsSync(join(output, "report.json"))
      ? JSON.parse(readFileSync(join(output, "report.json"), "utf8"))
      : null;
    writeFileSync(
      join(output, "report.json"),
      JSON.stringify(
        {
          models: catalogue.models.length,
          questions: catalogue.questions.length,
          reports: reports.length ? reports : (previous?.reports ?? []),
          ui: process.env.MOBILE_QA_UI === "1" || previous?.ui === true,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => server.close());
