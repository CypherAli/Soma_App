// Local integration QA: temporary accounts are scoped and removed in finally.
const { launchBrowser } = require("./qa-browser.cjs");
const fs = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  fs.mkdirSync("qa/polish", { recursive: true });
  fs.mkdirSync("qa/presentation", { recursive: true });
  const browser = await launchBrowser();
  const results = [],
    messages = [];
  try {
    const page = await browser.newPage({
      viewport: { width: 620, height: 980 },
    });
    page.setDefaultTimeout(30000);
    page.on("console", (m) => {
      if (["error", "warning"].includes(m.type())) messages.push(m.text());
    });
    page.on("pageerror", (e) => messages.push(e.message));
    if ((process.env.QA_URL || "http://localhost:8082").endsWith(":8085")) {
      await page.route("http://127.0.0.1:8083/api/**", async (route) => {
        const response = await route.fetch();
        await route.fulfill({
          response,
          headers: {
            ...response.headers(),
            "access-control-allow-origin": "http://localhost:8085",
          },
        });
      });
    }
    await page.addInitScript(() => {
      const old = console.error;
      console.error = (...args) => {
        old(...args);
        if (String(args[0]).includes("Unexpected text node"))
          old("TEXT_NODE_STACK", new Error().stack);
      };
    });
    await page.goto(
      (process.env.QA_URL || "http://localhost:8082") + "/atlas",
      { waitUntil: "domcontentloaded", timeout: 120000 },
    );
    const app = page.frameLocator('iframe[title="Soma — màn hình điện thoại"]');
    const search = app.getByRole("textbox", { name: "Tìm trong Atlas" });
    await search.waitFor({ timeout: 120000 });
    await search.fill("   ");
    await search.fill("Cơ thắt lưng lớn");
    await app.getByRole("button", { name: "Xóa từ tìm kiếm" }).click();
    await app
      .getByRole("button", {
        name: "Mở Mặt cắt ngang bụng (tầng L1)",
        exact: true,
      })
      .click();
    await app
      .getByRole("button", { name: /Cấu trúc \(\d+\)/ })
      .waitFor({ timeout: 120000 });
    async function check(label) {
      const raw = await app.locator("body").evaluate(() =>
        [...document.querySelectorAll('div[class*="css-view"]')].flatMap((el) =>
          [...el.childNodes]
            .filter(
              (n) => n.nodeType === Node.TEXT_NODE && n.textContent.length,
            )
            .map((n) => ({
              text: n.textContent,
              context: el.outerHTML.slice(0, 600),
            })),
        ),
      );
      results.push({ label, raw });
    }
    await check("loaded");
    await app.getByRole("button", { name: /Cấu trúc \(\d+\)/ }).click();
    await app
      .getByRole("textbox", { name: "Tìm cấu trúc trong mô hình" })
      .fill("Cơ thắt lưng lớn");
    await app
      .getByRole("button")
      .filter({ hasText: "Cơ thắt lưng lớn · phải" })
      .click();
    await app.getByRole("button", { name: "Chi tiết cấu trúc" }).waitFor();
    await check("selected");
    await page.screenshot({ path: "qa/presentation/atlas-text-selected.png" });
    for (const name of [
      "Cô lập",
      "Hiện xung quanh",
      "Làm mờ",
      "Bỏ mờ",
      "Ẩn",
      "Hiện lại",
    ]) {
      await app.getByRole("button", { name, exact: true }).click();
      await check(name);
    }
    await app
      .getByRole("button", { name: "Tách mô hình", exact: true })
      .click();
    await app.getByText("Mức tách · 0%", { exact: true }).waitFor();
    await check("tools");
    await app.getByText("+ 1%", { exact: true }).click();
    await app.getByText("Mức tách · 1%", { exact: true }).waitFor();
    await app.getByText("− 1%", { exact: true }).click();
    await app
      .getByRole("button", { name: "Nhìn góc chéo", exact: true })
      .click();
    await check("view");
    await app
      .getByRole("button", { name: "Đóng bảng thông tin", exact: true })
      .click();
    await app
      .getByRole("button", { name: "Chi tiết cấu trúc", exact: true })
      .click();
    await check("info");
    console.log(JSON.stringify({ results, messages }, null, 2));
    assert.equal(results.flatMap((r) => r.raw).length, 0);
    assert.deepEqual(messages, []);
  } finally {
    fs.writeFileSync(
      "qa/presentation/atlas-text-node-report.json",
      JSON.stringify({ results, messages }, null, 2),
    );
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
