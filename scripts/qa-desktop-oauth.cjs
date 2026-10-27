// Local integration QA: temporary accounts are scoped and removed in finally.
// Isolated QA: real Expo UI, redirects, PKCE, API and DB; provider identities are fixtures.
const { launchBrowser } = require("./qa-browser.cjs");
const { createRequire } = require("module"),
  path = require("path"),
  fs = require("fs"),
  assert = require("assert/strict"),
  { randomBytes, createHash } = require("crypto");
const be = createRequire(path.resolve("../soma_be/package.json"));
be("dotenv").config({ path: path.resolve("../soma_be/.env"), quiet: true });
const { PrismaService } = be("./dist/src/prisma/prisma.service.js"),
  { AuthService } = be("./dist/src/auth/auth.service.js"),
  { AuthController } = be("./dist/src/auth/auth.controller.js");
const marker = "qa-desktop-" + randomBytes(8).toString("hex"),
  email = marker + "@example.invalid";
const db = new PrismaService(),
  service = new AuthService(db, { configured: false }),
  controller = new AuthController(service);
const origin = "http://localhost:8082",
  checks = [],
  states = [];
let owner;
async function intercept(page, provider, cancel = false) {
  const pattern =
    provider === "github"
      ? "https://github.com/login/oauth/authorize**"
      : "https://www.facebook.com/v23.0/dialog/oauth**";
  await page.route(pattern, async (route) => {
    const url = new URL(route.request().url()),
      state = url.searchParams.get("state");
    states.push(createHash("sha256").update(state).digest("hex"));
    console.log("QA_PROVIDER_START", provider);
    assert.equal(
      url.searchParams.get("redirect_uri"),
      `http://localhost:4000/api/auth/oauth/${provider}/callback`,
    );
    const realFetch = globalThis.fetch;
    let result;
    try {
      globalThis.fetch = async (input) => {
        const u = new URL(String(input));
        if (
          u.href.startsWith("https://github.com/login/oauth/access_token") ||
          u.pathname.endsWith("/oauth/access_token")
        )
          return Response.json({ access_token: "fixture-only" });
        if (u.hostname === "api.github.com" && u.pathname === "/user")
          return Response.json({
            id: marker,
            login: "qa-desktop",
            name: "QA Desktop Account",
            email: null,
          });
        if (u.hostname === "api.github.com" && u.pathname === "/user/emails")
          return Response.json([{ email, primary: true, verified: true }]);
        if (u.hostname === "graph.facebook.com" && u.pathname === "/me")
          return Response.json({
            id: marker,
            name: "QA Desktop Account",
            email,
          });
        throw Error("Unexpected provider fixture request");
      };
      result = await controller.oauthCallback(
        provider,
        cancel ? undefined : "fixture-code",
        state,
        "Soma desktop QA",
        cancel ? "access_denied" : undefined,
      );
    } finally {
      globalThis.fetch = realFetch;
    }
    const user = await db.user.findFirst({ where: { email } });
    if (user) owner = user.id;
    assert.ok(result.url.startsWith(origin + "/oauth?"));
    assert.equal(result.url.includes("token="), false);
    console.log("QA_CALLBACK_READY", provider);
    await route.fulfill({
      status: 302,
      headers: { location: result.url },
      body: "",
    });
  });
}
(async () => {
  fs.mkdirSync("qa/polish", { recursive: true });
  fs.mkdirSync("qa/presentation", { recursive: true });
  await db.$connect();
  const browser = await launchBrowser();
  let page;
  const surface = (page) =>
    page.frameLocator('iframe[title="Soma — màn hình điện thoại"]');
  try {
    page = await browser.newPage({ viewport: { width: 410, height: 820 } });
    page.setDefaultTimeout(60000);
    page.setDefaultNavigationTimeout(120000);
    page.on("pageerror", (e) => console.log("PAGE_ERROR", e.message));
    page.on("requestfailed", (r) => {
      const u = new URL(r.url());
      console.log(
        "QA_REQUEST_FAILED",
        u.origin + u.pathname,
        r.failure()?.errorText,
      );
    });
    page.on("response", (r) => {
      if (r.status() >= 400) {
        const u = new URL(r.url());
        console.log("QA_HTTP_ERROR", r.status(), u.origin + u.pathname);
      }
    });
    await intercept(page, "github");
    await intercept(page, "facebook");
    await page.goto(origin + "/auth?next=profile", {
      waitUntil: "domcontentloaded",
    });
    await surface(page)
      .getByRole("button", { name: "Tiếp tục với GitHub", exact: true })
      .click();
    await surface(page)
      .getByText("QA Desktop Account", { exact: true })
      .first()
      .waitFor();
    await page.waitForURL("**/profile");
    assert.equal(
      await page.evaluate(() =>
        sessionStorage.getItem("soma.oauth.pending.web.v1"),
      ),
      null,
    );
    checks.push(
      "GitHub fixture identity with private email returns through real PKCE into Expo account",
    );
    await page.route("http://127.0.0.1:8083/api/auth/me", async (route) => {
      await new Promise((r) => setTimeout(r, 900));
      await route.continue();
    });
    await page.goto(origin + "/connections", { waitUntil: "domcontentloaded" });
    await surface(page)
      .getByRole("button", { name: "Liên kết tài khoản", exact: true })
      .last()
      .click();
    await surface(page)
      .getByText("Đã liên kết", { exact: true })
      .nth(1)
      .waitFor();
    const linked = await db.user.findUnique({ where: { id: owner } });
    assert.equal(linked.githubId, marker);
    assert.equal(linked.facebookId, marker);
    checks.push(
      "Facebook link waits for delayed session restoration and returns to the same owner",
    );
    await page.screenshot({ path: "qa/polish/desktop-connections.png" });
    const fresh = await browser.newPage({
      viewport: { width: 410, height: 820 },
    });
    fresh.setDefaultTimeout(60000);
    fresh.setDefaultNavigationTimeout(120000);
    await intercept(fresh, "facebook");
    await fresh.goto(origin + "/auth?next=profile", {
      waitUntil: "domcontentloaded",
    });
    await surface(fresh)
      .getByRole("button", { name: "Tiếp tục với Facebook", exact: true })
      .click();
    await surface(fresh)
      .getByText("QA Desktop Account", { exact: true })
      .first()
      .waitFor();
    await fresh.waitForURL("**/profile");
    assert.equal(await db.user.count({ where: { email } }), 1);
    checks.push(
      "Facebook sign-in returns to the linked account without creating a duplicate",
    );
    const cancelled = await browser.newPage({
      viewport: { width: 410, height: 820 },
    });
    cancelled.setDefaultTimeout(60000);
    cancelled.setDefaultNavigationTimeout(120000);
    await intercept(cancelled, "github", true);
    await cancelled.goto(origin + "/auth", { waitUntil: "domcontentloaded" });
    await surface(cancelled)
      .getByRole("button", { name: "Tiếp tục với GitHub", exact: true })
      .click();
    await surface(cancelled)
      .getByText("Bạn đã hủy đăng nhập.", { exact: true })
      .waitFor();
    checks.push("Provider cancellation returns to an actionable error in Expo");
    fs.writeFileSync(
      "qa/presentation/framed-oauth-report.json",
      JSON.stringify(
        {
          checks,
          realProviderAuthentication: false,
          providerIdentity: "isolated fixtures",
          localApi: true,
          phoneFrame: true,
        },
        null,
        2,
      ),
    );
    console.log(checks);
  } catch (e) {
    if (page) {
      await page.screenshot({ path: "qa/polish/desktop-oauth-failure.png" });
      console.log("QA_FAILURE_PATH", new URL(page.url()).pathname);
      console.log(
        "QA_FAILURE_TEXT",
        (await surface(page).locator("body").innerText()).slice(-2500),
      );
    }
    throw e;
  } finally {
    await browser.close();
    await db.oAuthState.deleteMany({ where: { stateHash: { in: states } } });
    if (owner)
      await db.user.deleteMany({
        where: { id: owner, email, githubId: marker },
      });
    await db.$disconnect();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
