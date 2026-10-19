const { launchBrowser } = require("./qa-browser.cjs");
const { createRequire } = require("node:module");
const { randomUUID, createHash } = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const backendRequire = createRequire(
  path.resolve(__dirname, "../../soma_be/package.json"),
);
backendRequire("dotenv").config({
  path: path.resolve(__dirname, "../../soma_be/.env"),
  quiet: true,
});
const { Client } = backendRequire("pg");
const output = path.resolve(__dirname, "../qa/screenshots");
fs.mkdirSync(output, { recursive: true });
const api = "http://localhost:4000/api",
  site = "http://localhost:8082";
const users = [];
async function apiGet(route, token) {
  const r = await fetch(api + route, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  assert.equal(r.status, 200);
  return r.json();
}
(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const browser = await launchBrowser();
  const context = await browser.newContext({
    viewport: { width: 400, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => void d.accept());
  await page.addInitScript(() => {
    window.__viewerEvents = [];
    window.addEventListener("message", (event) => {
      if (event.data?.source === "soma-mobile-viewer")
        window.__viewerEvents.push(event.data);
    });
  });
  const text = (value) => page.getByText(value, { exact: true });
  const button = (name) => page.getByRole("button", { name, exact: true });
  const shot = (name) =>
    page.screenshot({ path: path.join(output, name + ".png"), fullPage: true });
  async function signUp() {
    await page.goto(site + "/auth");
    await button("Đăng ký").first().click();
    const email = `mobile-ui-${randomUUID()}@example.invalid`,
      password = `Qa1_${randomUUID()}`;
    await page.getByLabel("Họ và tên", { exact: true }).fill("Sinh viên QA");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page.getByLabel("Nhập lại mật khẩu", { exact: true }).fill(password);
    await page.getByRole("checkbox").click();
    const response = page.waitForResponse(
      (r) =>
        r.url() === api + "/auth/register" && r.request().method() === "POST",
    );
    await button("Đăng ký").last().click();
    const r = await response;
    assert.equal(r.status(), 201);
    const value = await r.json();
    users.push({ ...value, email });
    await page.getByRole("heading", { name: "Ôn tập", exact: true }).waitFor();
    await button("Bắt đầu luyện tập").waitFor();
    return value;
  }
  try {
    const catalog = await apiGet("/mobile/bootstrap");
    await page.goto(site);
    await text("Mở Atlas").waitFor();
    await shot("home");
    assert.equal(await page.getByRole("tab").count(), 4);
    await page.getByRole("tab", { name: "Atlas", exact: true }).click();
    await page.getByLabel("Tìm trong Atlas").fill("Liver");
    await page.getByRole("button", { name: /^Mở Giải phẫu Gan/ }).waitFor();
    await page.getByLabel("Tìm trong Atlas").fill("");
    await shot("atlas");
    await page.getByRole("button", { name: /^Mở Xương Bàn tay/ }).click();
    await page.waitForFunction(
      () => window.__viewerEvents.some((e) => e.type === "ready"),
      undefined,
      { timeout: 45000 },
    );
    const frame = page.frameLocator("iframe");
    await frame.locator("canvas").waitFor();
    const canvas = frame.locator("canvas"),
      before = await canvas.screenshot();
    const box = await canvas.boundingBox();
    await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.56, {
      steps: 8,
    });
    await page.mouse.up();
    const after = await canvas.screenshot();
    assert.notEqual(
      createHash("sha256").update(before).digest("hex"),
      createHash("sha256").update(after).digest("hex"),
      "Orbit drag should change rendered model",
    );
    await button("Lưu mô hình").click();
    await button("Bỏ lưu mô hình").waitFor();
    await shot("viewer");
    await text("Cấu trúc (54)").click();
    await page.getByLabel("Tìm cấu trúc trong mô hình").fill("thuyền");
    await text("Xương thuyền (trái)").click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await text(
      catalog.models
        .find((m) => m.id === "ban-tay")
        .structures.find((s) => s.label === "Xương thuyền (trái)").note,
    ).waitFor();
    await page.getByRole("button", { name: "Về Atlas", exact: true }).click();
    await page.getByRole("tab", { name: "Ôn tập", exact: true }).click();
    await text("Đăng nhập để tiếp tục").waitFor();
    const account = await signUp();
    const submissions = [];
    const simulateRetry = process.env.MOBILE_QA_RETRY === "1";
    if (simulateRetry) {
      await page.route(api + "/mobile/attempts", async (route) => {
        submissions.push(route.request().postDataJSON());
        if (submissions.length === 1)
          await route.fulfill({
            status: 503,
            contentType: "application/json",
            body: JSON.stringify({
              message:
                "Máy chủ thử nghiệm tạm mất kết nối. Hãy gửi lại kết quả.",
            }),
          });
        else await route.continue();
      });
    }
    await button("Bắt đầu luyện tập").click();
    for (let i = 0; i < 10; i++) {
      await text(`${i + 1} / 10`).waitFor();
      const prompt = await page
        .getByRole("heading", { name: /^Tên Latin/ })
        .innerText();
      const q = catalog.questions.find((q) => q.prompt === prompt);
      assert.ok(q, "UI question must come from the published catalogue");
      const choice = q.options.find((o) =>
        i === 0 ? o.id !== q.correctOptionId : o.id === q.correctOptionId,
      );
      await text(choice.text).click();
      await button("Xác nhận đáp án").click();
      await text(q.explanation).waitFor();
      if (i === 0) await shot("quiz");
      await button(i === 9 ? "Hoàn thành bài làm" : "Câu tiếp theo").click();
      if (i === 1) {
        await button("Lưu bài và quay lại").click();
        await button("Tiếp tục bài đang làm · 2/10").click();
      }
    }
    await page
      .getByRole("heading", { name: "Kết quả luyện tập", exact: true })
      .waitFor();
    if (simulateRetry) {
      await text(
        "Máy chủ thử nghiệm tạm mất kết nối. Hãy gửi lại kết quả.",
      ).waitFor();
      assert.equal(
        (await apiGet("/study/history", account.token)).attempts.length,
        0,
      );
      await button("Lưu kết quả lên tài khoản").click();
    }
    await page
      .getByRole("heading", { name: "Đã đồng bộ", exact: true })
      .waitFor({ timeout: 30000 });
    await shot("result");
    const history = await apiGet("/study/history", account.token);
    if (simulateRetry) {
      assert.equal(submissions.length, 2);
      assert.deepEqual(submissions[0], submissions[1]);
    }
    assert.equal(history.attempts.length, 1);
    assert.equal(history.attempts[0].score, 9);
    await button("Về Hôm nay").first().click();
    await text("Tạo lộ trình").click();
    await page
      .getByLabel("Mục tiêu học tập")
      .fill("Lộ trình kiểm thử app Soma");
    await button("Hệ xương").click();
    const savedPlan = page.waitForResponse(
      (r) => r.url() === api + "/study/path" && r.request().method() === "PUT",
    );
    await button("Tạo lộ trình").click();
    assert.equal((await savedPlan).status(), 200);
    const plan = await apiGet("/study/path", account.token);
    assert.equal(plan.path.goal, "Lộ trình kiểm thử app Soma");
    await page.getByRole("button", { name: "Về Hôm nay", exact: true }).click();
    await page.getByRole("tab", { name: "Cá nhân", exact: true }).click();
    await shot("profile");
    await text("Mô hình đã lưu").click();
    await text("Chưa lưu mô hình nào").waitFor();
    await page.getByRole("button", { name: "Về Hôm nay", exact: true }).click();
    await page.getByRole("tab", { name: "Cá nhân", exact: true }).click();
    await button("Cài đặt").click();
    await button("Tối").click();
    await button("Lưu cài đặt").click();
    await text("Đã lưu cài đặt.").waitFor();
    await page.getByRole("button", { name: "Về Hôm nay", exact: true }).click();
    await shot("dark");
    await page.getByRole("tab", { name: "Cá nhân", exact: true }).click();
    await button("Đăng xuất").click();
    await button("Đăng nhập / Đăng ký").waitFor();
    const second = await signUp();
    const isolated = await apiGet("/study/history", second.token);
    assert.equal(isolated.attempts.length, 0);
    await page.getByRole("tab", { name: "Cá nhân", exact: true }).click();
    await text("Mô hình đã lưu").click();
    await text("Chưa lưu mô hình nào").waitFor();
    await page.getByRole("button", { name: "Về Hôm nay", exact: true }).click();
    await page.setViewportSize({ width: 320, height: 850 });
    await shot("width-320");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    assert.equal(overflow, false);
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, "../web-report.json"),
      JSON.stringify(
        {
          passed: true,
          syncRetry: simulateRetry,
          checks: [
            "4 tabs",
            "Atlas search",
            "3D rendering and orbit",
            "structure selection",
            "local bookmarks",
            "registration",
            "10-question practice",
            "resume draft",
            "automatic sync",
            "web history",
            "plan persistence",
            "dark theme",
            "account isolation",
            "320px layout",
          ],
          runtimeErrors: errors,
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: full mobile UI flow, real 3D, draft resume, account isolation, plan and study sync.",
    );
  } catch (error) {
    await shot("failure").catch(() => {});
    console.error("UI failure:", error.message);
    console.error((await page.locator("body").innerText()).slice(-2300));
    throw error;
  } finally {
    await browser.close();
    if (users.length)
      await db.query(
        "DELETE FROM users WHERE id=ANY($1::text[]) AND email=ANY($2::text[])",
        [users.map((u) => u.user.id), users.map((u) => u.email)],
      );
    await db.end();
  }
})().catch((e) => {
  console.error(e.stack);
  process.exit(1);
});
