// Real packaged Expo UI and account API; payment responses are isolated fixtures.
// Never create a live SePay invoice or transfer money in this test.
const { launchBrowser } = require("./qa-browser.cjs");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID, randomBytes } = require("node:crypto");
const { createRequire } = require("node:module");
const be = createRequire(path.resolve("../soma_be/package.json"));
be("dotenv").config({ path: path.resolve("../soma_be/.env"), quiet: true });
const { Client } = be("pg");
const api = "http://127.0.0.1:8083/api",
  origin = "http://localhost:8082";

(async () => {
  fs.mkdirSync("qa/production", { recursive: true });
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const browser = await launchBrowser(),
    accounts = [],
    checks = [],
    errors = [];
  try {
    for (let index = 0; index < 2; index++) {
      const email = `qa-premium-${randomUUID()}@example.invalid`;
      const result = await fetch(api + "/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password: "Qa9" + randomBytes(12).toString("hex"),
          name: `Premium QA ${index + 1}`,
        }),
      });
      assert.equal(result.status, 201);
      accounts.push({ ...(await result.json()), email });
    }
    // Verify ownership and live-mode simulation rejection using an unpaid local row.
    // Reading this row generates no requests to the payment provider.
    const row = "qaorder-" + randomUUID(),
      code = "SOMA" + randomBytes(8).toString("hex").toUpperCase();
    await db.query(
      "INSERT INTO premium_orders (id, code, \"userId\", amount, status, provider) VALUES ($1,$2,$3,25000,'pending','sepay-production')",
      [row, code, accounts[0].user.id],
    );
    for (const [token, expected] of [
      [accounts[0].token, 200],
      [accounts[1].token, 404],
      [null, 401],
    ]) {
      const result = await fetch(`${api}/membership/orders/${row}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      assert.equal(result.status, expected);
    }
    const simulation = await fetch(`${api}/membership/orders/${row}/simulate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accounts[0].token}` },
    });
    assert.equal(simulation.status, 400);
    assert.equal(
      (await fetch(api + "/membership/checkout", { method: "POST" })).status,
      401,
    );
    checks.push(
      "Real API: order ownership, unauthenticated checkout denial, live-order simulation rejection",
    );

    const context = await browser.newContext({
      hasTouch: true,
      isMobile: true,
      viewport: { width: 390, height: 844 },
    });
    const state = accounts.map(() => ({
      sandbox: false,
      pro: false,
      enabled: true,
      order: null,
      count: 0,
      failOnce: false,
      wrongAmount: false,
    }));
    const status = (s) => ({
      plan: s.pro ? "pro" : "free",
      limit: s.pro ? 30 : 10,
      used: 2,
      remaining: (s.pro ? 30 : 10) - 2,
      resetsAt: "2026-11-01T00:00:00+07:00",
      premiumUntil: s.pro ? "2026-11-28T00:00:00+07:00" : null,
      paymentEnabled: s.enabled,
      sandbox: s.sandbox,
      price: 25000,
    });
    const fixture = (s) => ({ ...s.order, amount: s.wrongAmount ? 1 : 25000 });
    await context.route("**/api/membership**", async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      const index = accounts.findIndex(
        (a) => request.headers().authorization === `Bearer ${a.token}`,
      );
      if (index < 0)
        return route.fulfill({
          status: 401,
          json: { message: "Unauthorized" },
        });
      const s = state[index];
      if (url.pathname === "/api/membership")
        return route.fulfill({ json: status(s) });
      if (url.pathname === "/api/membership/checkout") {
        if (
          !s.order ||
          s.order.status === "paid" ||
          s.order.sandbox !== s.sandbox
        ) {
          const code = "SOMA" + String(++s.count).padStart(16, "0");
          s.order = {
            id: `qapremium${index}${s.count}`,
            code,
            amount: 25000,
            status: "pending",
            sandbox: s.sandbox,
            bank: "QA fixture bank",
            account: `QA-ACCOUNT-${index}`,
            holder: "QA fixture only",
            transferContent: `PAYQA${index}${s.count}`,
            qrUrl: "https://qr.sepay.vn/img?qa=1",
            checkout: {
              url: `https://${s.sandbox ? "pay-sandbox" : "pay"}.sepay.vn/v1/checkout/init`,
              fields: {
                merchant: "QA_ONLY",
                signature: "QA_FIXTURE",
                order_amount: "25000",
                currency: "VND",
                order_invoice_number: code,
              },
            },
          };
        }
        return route.fulfill({ json: fixture(s) });
      }
      if (url.pathname.endsWith("/simulate")) {
        assert.equal(s.sandbox, true, "Live UI must never simulate payment");
        s.order.status = "paid";
        s.pro = true;
        return route.fulfill({ json: { success: true } });
      }
      if (s.failOnce) {
        s.failOnce = false;
        return route.fulfill({
          status: 503,
          json: { message: "QA temporary outage" },
        });
      }
      if (s.order && url.pathname.endsWith("/" + s.order.id))
        return route.fulfill({ json: fixture(s) });
      return route.fulfill({
        status: 404,
        json: { message: "Order not found" },
      });
    });
    await context.route("**/api/mobile/account", async (route) => {
      const index = accounts.findIndex(
        (a) => route.request().headers().authorization === `Bearer ${a.token}`,
      );
      const response = await route.fetch();
      if (index < 0) return route.fulfill({ response });
      const data = await response.json();
      data.membership = status(state[index]);
      await route.fulfill({ response, json: data });
    });
    await context.route("https://qr.sepay.vn/**", (route) =>
      route.fulfill({
        contentType: "image/png",
        body: fs.readFileSync("assets/icon.png"),
      }),
    );
    let providerPosts = 0;
    await context.route("https://pay.sepay.vn/**", async (route) => {
      assert.equal(route.request().method(), "POST");
      const body = new URLSearchParams(route.request().postData());
      assert.equal(body.get("order_amount"), "25000");
      assert.equal(body.has("token"), false);
      providerPosts++;
      await route.fulfill({
        contentType: "text/html",
        body: "<p>QA provider fixture only. No real payment.</p>",
      });
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin, { waitUntil: "domcontentloaded" });
    async function login(index, target = "/profile") {
      const account = accounts[index];
      await page.evaluate(
        (value) =>
          sessionStorage.setItem(
            "soma.credential.tab.v1",
            JSON.stringify(value),
          ),
        {
          token: account.token,
          expiresAt: account.expiresAt,
          userId: account.user.id,
          apiUrl: api,
        },
      );
      await page.goto(origin + target, { waitUntil: "domcontentloaded" });
    }
    await login(0);
    await page
      .getByRole("button", { name: "Nâng cấp Premium", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Nâng cấp Premium · 25.000đ", exact: true })
      .click();
    await page.getByText("QA-ACCOUNT-0", { exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("button", {
          name: "Giả lập thanh toán Sandbox",
          exact: true,
        })
        .count(),
      0,
    );
    const first = state[0].order.id;
    await page.screenshot({
      path: "qa/production/premium-ui-light.png",
      fullPage: true,
    });
    await page.goto(origin + "/premium?payment=success", {
      waitUntil: "domcontentloaded",
    });
    await page.getByText("QA-ACCOUNT-0", { exact: true }).waitFor();
    assert.equal(state[0].order.id, first);
    assert.equal(state[0].pro, false);
    assert.equal(
      await page
        .getByText("Thanh toán đã được xác nhận. Premium đã kích hoạt.", {
          exact: true,
        })
        .count(),
      0,
    );
    checks.push(
      "Upgrade, pending-order restore, and redirect success cannot grant Premium",
    );
    const popupPromise = page.waitForEvent("popup");
    await page
      .getByRole("button", { name: "Mở trang thanh toán SePay", exact: true })
      .click();
    const popup = await popupPromise;
    await popup
      .getByText("QA provider fixture only. No real payment.")
      .waitFor();
    await popup.close();
    assert.equal(providerPosts, 1);
    assert.equal(state[0].pro, false);
    checks.push(
      "Official checkout fallback submits the fixed-price signed form without bearer token",
    );
    state[0].failOnce = true;
    await page
      .getByRole("button", { name: "Kiểm tra thanh toán", exact: true })
      .click();
    await page.getByText("QA temporary outage", { exact: true }).waitFor();
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.getByText("QA-ACCOUNT-0", { exact: true }).waitFor();
    state[0].order.status = "paid";
    state[0].pro = true;
    await page
      .getByRole("button", { name: "Kiểm tra thanh toán", exact: true })
      .click();
    await page
      .getByText("Thanh toán đã được xác nhận. Premium đã kích hoạt.", {
        exact: true,
      })
      .waitFor();
    await page.goto(origin + "/profile", { waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: "Gia hạn Premium", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Gia hạn Premium", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Gia hạn Premium · 25.000đ", exact: true })
      .click();
    await page.getByText("QA-ACCOUNT-0", { exact: true }).waitFor();
    assert.notEqual(state[0].order.id, first);
    checks.push(
      "Transient failure preserves pending order; verified payment refreshes plan; renewal creates a new order",
    );
    await login(1, "/premium");
    await page
      .getByRole("button", { name: "Nâng cấp Premium · 25.000đ", exact: true })
      .waitFor();
    assert.equal(
      await page.getByText("QA-ACCOUNT-0", { exact: true }).count(),
      0,
    );
    state[1].wrongAmount = true;
    await page
      .getByRole("button", { name: "Nâng cấp Premium · 25.000đ", exact: true })
      .click();
    await page
      .getByText(
        "Đơn thanh toán không hợp lệ hoặc thuộc môi trường khác. Vui lòng thử lại.",
        { exact: true },
      )
      .waitFor();
    assert.equal(
      await page.getByText("QA-ACCOUNT-1", { exact: true }).count(),
      0,
    );
    state[1].wrongAmount = false;
    state[1].sandbox = true;
    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .getByText("Chế độ thử nghiệm — không chuyển tiền thật.", { exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Nâng cấp Premium · 25.000đ", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Giả lập thanh toán Sandbox", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Giả lập thanh toán Sandbox", exact: true })
      .click();
    await page
      .getByText("Thanh toán đã được xác nhận. Premium đã kích hoạt.", {
        exact: true,
      })
      .waitFor();
    state[1].sandbox = false;
    state[1].pro = false;
    await page.reload({ waitUntil: "domcontentloaded" });
    await page
      .getByRole("button", { name: "Nâng cấp Premium · 25.000đ", exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole("button", {
          name: "Giả lập thanh toán Sandbox",
          exact: true,
        })
        .count(),
      0,
    );
    assert.equal(
      await page.getByText("QA-ACCOUNT-1", { exact: true }).count(),
      0,
    );
    checks.push(
      "Account and Sandbox/Production isolation; wrong amount rejected; simulation only in Sandbox",
    );
    for (const colorScheme of ["light", "dark"]) {
      await page.emulateMedia({ colorScheme });
      for (const width of [320, 390, 414]) {
        await page.setViewportSize({ width, height: 844 });
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          true,
        );
      }
    }
    await page.screenshot({
      path: "qa/production/premium-ui-dark.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Tùy chọn hiển thị", exact: true })
      .click();
    await page.getByRole("radio", { name: "English", exact: true }).click();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page
      .getByText("Premium · 30 questions/month", { exact: true })
      .waitFor();
    await page
      .getByRole("button", {
        name: "Upgrade to Premium · 25,000 VND",
        exact: true,
      })
      .click();
    await page.getByText("Transfer reference", { exact: true }).waitFor();
    for (const width of [320, 390, 414]) {
      await page.setViewportSize({ width, height: 844 });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
    }
    await page.screenshot({
      path: "qa/production/premium-ui-en.png",
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    checks.push(
      "320–414px VI/EN light/dark without horizontal overflow or runtime errors",
    );
    fs.writeFileSync(
      "qa/production/premium-report.json",
      JSON.stringify(
        { checks, fixturePayments: true, realTransfers: 0, errors },
        null,
        2,
      ),
    );
    console.log(checks);
  } finally {
    await browser.close();
    for (const account of accounts)
      await db.query("DELETE FROM users WHERE id=$1 AND email=$2", [
        account.user.id,
        account.email,
      ]);
    await db.end();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
