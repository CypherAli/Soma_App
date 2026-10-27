// Local integration QA: temporary accounts are scoped and removed in finally.
const { launchBrowser } = require("./qa-browser.cjs"),
  fs = require("fs"),
  assert = require("assert/strict"),
  path = require("path"),
  { createRequire } = require("module"),
  { randomUUID, randomBytes } = require("crypto");
const be = createRequire(path.resolve("../soma_be/package.json"));
be("dotenv").config({ path: path.resolve("../soma_be/.env"), quiet: true });
const { Client } = be("pg");
(async () => {
  fs.mkdirSync("qa/polish", { recursive: true });
  fs.mkdirSync("qa/presentation", { recursive: true });
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  let owner, email;
  const browser = await launchBrowser(),
    checks = [];
  try {
    email = "qa-polish-ui-" + randomUUID() + "@example.invalid";
    const password = "Design9" + randomBytes(10).toString("hex");
    const r = await fetch("http://127.0.0.1:8083/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: "QA Soma" }),
    });
    const account = await r.json();
    assert.equal(r.status, 201);
    owner = account.user.id;
    const page = await browser.newPage({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });
    page.setDefaultNavigationTimeout(120000);
    page.setDefaultTimeout(60000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept());
    await page.goto("http://localhost:8082/", {
      waitUntil: "domcontentloaded",
    });
    await page.getByText("Khám phá cơ thể người", { exact: true }).waitFor();
    assert.equal(await page.getByText("☀", { exact: true }).count(), 0);
    await page.screenshot({ path: "qa/polish/home-light.png" });
    await page
      .getByRole("button", { name: "Tùy chọn hiển thị", exact: true })
      .click();
    await page.getByRole("radio", { name: "Tối", exact: true }).click();
    await page.screenshot({ path: "qa/polish/display-dark.png" });
    await page.getByRole("radio", { name: "Sáng", exact: true }).click();
    await page.getByRole("button", { name: "Đóng", exact: true }).click();
    checks.push("Monochrome display menu, no emoji");
    await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Đăng nhập", exact: true })
      .last()
      .click();
    await page
      .getByRole("button", { name: "Đề ôn tập giải phẫu", exact: true })
      .waitFor();
    await page.getByRole("tab", { name: "Cá nhân", exact: true }).click();
    await page.getByText("QA Soma", { exact: true }).waitFor();
    await page
      .getByText("Lượt hỏi trợ lý còn lại trong tháng", { exact: true })
      .waitFor();
    await page.screenshot({ path: "qa/polish/profile-light.png" });
    checks.push("Profile with real account fields and quota");
    await page
      .getByRole("button", { name: "Hồ sơ tài khoản", exact: true })
      .last()
      .click();
    await page.getByLabel("Họ và tên", { exact: true }).fill("QA Minh An");
    await page.getByRole("button", { name: "Giáo viên", exact: true }).click();
    await page
      .getByRole("button", { name: "Lưu thay đổi", exact: true })
      .click();
    await page
      .getByText("Đã lưu thông tin tài khoản.", { exact: true })
      .waitFor();
    checks.push("Profile and learning role saved");
    const chooser = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "Thêm ảnh đại diện", exact: true })
      .click();
    await (await chooser).setFiles(path.resolve("assets/icon.png"));
    await page
      .getByText("Đã cập nhật ảnh đại diện.", { exact: true })
      .waitFor();
    await page.screenshot({ path: "qa/polish/account-light.png" });
    checks.push("Profile photo picker, resize and upload");
    await page
      .getByRole("button", { name: "Bảo mật và thiết bị", exact: true })
      .click();
    await page.getByText("Thiết bị hiện tại", { exact: true }).waitFor();
    const updatedPassword = "Updated9" + randomBytes(10).toString("hex");
    await page.getByLabel("Mật khẩu hiện tại", { exact: true }).fill(password);
    await page
      .getByLabel("Mật khẩu mới", { exact: true })
      .fill(updatedPassword);
    await page
      .getByLabel("Nhập lại mật khẩu mới", { exact: true })
      .fill(updatedPassword);
    await page
      .getByRole("button", { name: "Đổi mật khẩu", exact: true })
      .click();
    await page
      .getByText("Đã đổi mật khẩu. Các phiên cũ đã được đăng xuất.", {
        exact: true,
      })
      .waitFor();
    checks.push("Password change retains the current account");
    await page.screenshot({ path: "qa/polish/security-light.png" });
    checks.push("Current session shown");
    await page.getByRole("button", { name: "Cá nhân", exact: true }).click();
    await page
      .getByRole("button", { name: "Tài khoản liên kết", exact: true })
      .click();
    await page.getByText("Google", { exact: true }).waitFor();
    await page.screenshot({ path: "qa/polish/connections-light.png" });
    checks.push("Real connection statuses shown");
    await page.getByRole("button", { name: "Về Hôm nay", exact: true }).click();
    await page.getByRole("tab", { name: "Ôn tập", exact: true }).click();
    await page
      .getByRole("button", { name: "Đề ôn tập giải phẫu", exact: true })
      .click();
    await page
      .getByRole("button", { name: /câu hỏi$/ })
      .first()
      .waitFor();
    assert.equal(
      /dr[.\s]*l[âa]m/i.test(await page.locator("body").innerText()),
      false,
    );
    await page.screenshot({ path: "qa/polish/source-library.png" });
    checks.push("Source library without personal branding");
    await page.goto("http://localhost:8082/atlas/giai-phau-so", {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByRole("button", { name: "Tách mô hình", exact: true })
      .click();
    await page.getByText("Góc nhìn", { exact: true }).waitFor();
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 844 });
      for (const label of ["Trước", "Sau", "Bên", "Góc chéo", "Trên", "Dưới"]) {
        const text = page.getByText(label, { exact: true });
        await text.scrollIntoViewIfNeeded();
        const lines = await text.evaluate((el) => {
          const r = document.createRange();
          r.selectNodeContents(el);
          const tops = [...r.getClientRects()]
            .filter((rect) => rect.width > 0 && rect.height > 0)
            .map((rect) => rect.top)
            .sort((a, b) => a - b);
          return tops.filter(
            (top, index) => index === 0 || top - tops[index - 1] > 2,
          ).length;
        });
        assert.equal(lines, 1, label + " must stay on one line");
      }
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({ path: `qa/polish/view-buttons-${width}.png` });
    }
    checks.push("Six view labels stay on one line at 320/390px");
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      "qa/polish/ui-report.json",
      JSON.stringify({ checks }, null, 2),
    );
    console.log(checks);
  } finally {
    await browser.close();
    if (owner && email)
      await db.query("DELETE FROM users WHERE id=$1 AND email=$2", [
        owner,
        email,
      ]);
    await db.end();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
