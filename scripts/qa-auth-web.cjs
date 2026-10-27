const { launchBrowser } = require("./qa-browser.cjs");
const { createRequire } = require("node:module");
const { randomBytes } = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs");
const assert = require("node:assert/strict");
const backend = createRequire(
  path.resolve(__dirname, "../../soma_be/package.json"),
);
backend("dotenv").config({
  path: path.resolve(__dirname, "../../soma_be/.env"),
  quiet: true,
});
const { Client } = backend("pg");
const email = `auth-ui-${randomBytes(12).toString("hex")}@example.invalid`,
  password = `Qa1_${randomBytes(12).toString("hex")}`;
const output = path.resolve(__dirname, "../qa/auth");
fs.mkdirSync(output, { recursive: true });
(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const browser = await launchBrowser();
  const page = await browser.newPage({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  });
  const errors = [];
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(120000);
  page.on("pageerror", (e) => errors.push(e.message));
  let userId;
  try {
    await page.goto("http://localhost:8082/auth?next=profile");
    await page
      .getByRole("button", { name: "Tiếp tục với Google", exact: true })
      .waitFor();
    await page.screenshot({
      path: path.join(output, "login.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Đăng ký", exact: true })
      .first()
      .click();
    await page.getByLabel("Họ và tên", { exact: true }).fill("Soma auth QA");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
    const submit = () =>
      page.getByRole("button", { name: "Đăng ký", exact: true }).last().click();
    await submit();
    await page
      .getByText("Mật khẩu nhập lại chưa khớp.", { exact: true })
      .waitFor();
    await page.getByLabel("Nhập lại mật khẩu", { exact: true }).fill(password);
    await submit();
    await page
      .getByText("Bạn cần đồng ý điều khoản sử dụng và chính sách bảo mật.", {
        exact: true,
      })
      .waitFor();
    await page.getByRole("checkbox").click();
    await page.screenshot({
      path: path.join(output, "register.png"),
      fullPage: true,
    });
    const response = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/auth/register") &&
        r.request().method() === "POST",
    );
    await submit();
    const r = await response;
    assert.equal(r.status(), 201);
    const auth = await r.json();
    userId = auth.user.id;
    await page.getByText(email, { exact: true }).waitFor();
    const login = await fetch("http://localhost:4000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    assert.equal(login.status, 200);
    assert.equal((await login.json()).user.id, userId);
    // A fresh browser tab has no in-memory app session, so verify ordinary login too.
    const fresh = await browser.newPage({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 320, height: 720 },
      colorScheme: "dark",
    });
    await fresh.goto("http://localhost:8082/auth?next=profile");
    await fresh.getByLabel("Email", { exact: true }).fill(email);
    await fresh.getByLabel("Mật khẩu", { exact: true }).fill(password);
    await fresh
      .getByRole("button", { name: "Hiện mật khẩu", exact: true })
      .click();
    await fresh
      .getByRole("button", { name: "Ẩn mật khẩu", exact: true })
      .waitFor();
    await fresh.screenshot({
      path: path.join(output, "login-dark-320.png"),
      fullPage: true,
    });
    await fresh
      .getByRole("button", { name: "Đăng nhập", exact: true })
      .last()
      .click();
    await fresh.getByText(email, { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, "report.json"),
      JSON.stringify(
        {
          passed: true,
          at: new Date().toISOString(),
          checks: [
            "confirm password required",
            "terms required",
            "register creates shared account",
            "email login returns same identity",
            "post-login destination",
            "show/hide password",
            "390px light and 320px dark layout",
          ],
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: auth validation, real registration/shared login, destination, password visibility and compact layouts",
    );
  } catch (error) {
    await page
      .screenshot({ path: path.join(output, "failure.png"), fullPage: true })
      .catch(() => {});
    console.error((await page.locator("body").innerText()).slice(-2000));
    throw error;
  } finally {
    await browser.close();
    await db.query(
      "DELETE FROM users WHERE email=$1 AND ($2::text IS NULL OR id=$2)",
      [email, userId ?? null],
    );
    await db.end();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
