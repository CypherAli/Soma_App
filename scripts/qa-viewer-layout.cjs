const { launchBrowser } = require("./qa-browser.cjs");
const { PNG } = require("pngjs");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const output = path.resolve(__dirname, "../qa/refined");
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://localhost:8082/atlas/ban-tay");
    await page
      .getByRole("button", { name: "Cấu trúc (54)", exact: true })
      .waitFor({ timeout: 45000 });
    const canvas = page.frameLocator("iframe").locator("canvas");
    const box = await canvas.boundingBox();
    assert.ok(
      box.height >= 844 * 0.6,
      "Anatomy viewport must occupy at least 60% of the phone",
    );
    await page.getByRole("button", { name: "Hai tay", exact: true }).click();
    await page.waitForTimeout(1200);
    const pair = PNG.sync.read(await canvas.screenshot());
    let x0 = pair.width,
      x1 = 0,
      y0 = pair.height,
      y1 = 0;
    for (let y = 0; y < pair.height; y++)
      for (let x = 0; x < pair.width; x++) {
        const offset = (y * pair.width + x) * 4;
        const [r, g, b] = pair.data.subarray(offset, offset + 3);
        if (r > 110 && g > 90 && b > 55 && r > g && g > b && r - b > 18) {
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
        }
      }
    const coverage = {
      width: (x1 - x0) / pair.width,
      height: (y1 - y0) / pair.height,
    };
    assert.ok(
      coverage.width >= 0.5 && coverage.height >= 0.25,
      `Comparison hands must be readable: ${JSON.stringify(coverage)}`,
    );
    await page.screenshot({ path: path.join(output, "viewer-both.png") });
    await page.getByRole("button", { name: "Tay phải", exact: true }).click();
    await page.screenshot({ path: path.join(output, "viewer-right.png") });
    await page
      .getByRole("button", { name: "Thông tin mô hình", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Đóng bảng thông tin", exact: true })
      .waitFor();
    await page.screenshot({ path: path.join(output, "viewer-info.png") });
    await page
      .getByRole("button", { name: "Đóng bảng thông tin", exact: true })
      .click();
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "No horizontal overflow",
      );
      const controls = await page
        .getByRole("button", { name: "Cấu trúc (54)", exact: true })
        .boundingBox();
      assert.ok(controls.x >= 0 && controls.x + controls.width <= width);
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, "report.json"),
      JSON.stringify(
        { passed: true, coverage, viewport: box, errors },
        null,
        2,
      ),
    );
    console.log(
      "PASS: large 3D viewport, readable paired hands, information sheet, 320px layout.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack);
  process.exit(1);
});
