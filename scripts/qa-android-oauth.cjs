// Emulator-only: real app, system browser, shared API/DB; provider consent is simulated.
const { execFileSync } = require("node:child_process");
const { createRequire } = require("node:module");
const { randomBytes, createHash } = require("node:crypto");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const backend = createRequire(path.resolve(__dirname, "../../soma_be/package.json"));
backend("dotenv").config({ path: path.resolve(__dirname, "../../soma_be/.env"), quiet: true });
const { PrismaService } = backend("./dist/src/prisma/prisma.service.js");
const { AuthService } = backend("./dist/src/auth/auth.service.js");
const { AuthController } = backend("./dist/src/auth/auth.controller.js");
const adbPath = path.join(process.env.LOCALAPPDATA, "Android/Sdk/platform-tools/adb.exe");
const adb = (...args) => execFileSync(adbPath, ["-s", "emulator-5554", ...args], { encoding: "utf8", timeout: 30000, windowsHide: true });
const pause = ms => new Promise(r => setTimeout(r, ms));
const output = path.resolve(__dirname, "../qa/android-oauth");
fs.mkdirSync(output, { recursive: true });
function tree() {
  adb("shell", "rm", "-f", "/sdcard/soma-oauth-qa.xml");
  adb("shell", "uiautomator", "dump", "--compressed", "/sdcard/soma-oauth-qa.xml");
  const xml = adb("shell", "cat", "/sdcard/soma-oauth-qa.xml");
  return [...xml.matchAll(/<node\s+([^>]+)>?/g)].map(m => Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(a => [a[1], a[2]])));
}
async function wait(label, scroll = false) {
  for (let i = 0; i < 12; i++) {
    const n = tree().find(n => (n["content-desc"] === label || n.text === label) && n.bounds !== "[0,0][0,0]" && (label !== "Địa chỉ API" || n.class === "android.widget.EditText"));
    if (n) return n;
    if (scroll && i > 1) adb("shell", "input", "swipe", "360", "1250", "360", "650", "300");
    await pause(400);
  }
  throw new Error(`Missing native control: ${label}`);
}
async function tap(label, scroll = false) {
  const n = await wait(label, scroll), [x,y,r,b] = n.bounds.match(/\d+/g).map(Number);
  adb("shell", "input", "tap", String(Math.round((x+r)/2)), String(Math.round((y+b)/2)));
}
function launch(route) { adb("shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", `soma://${route}`, "vn.soma.mobile"); }
function shot(name) { fs.writeFileSync(path.join(output, name + ".png"), execFileSync(adbPath, ["-s", "emulator-5554", "exec-out", "screencap", "-p"], { timeout: 15000, windowsHide: true })); }
async function setApi(value) {
  launch("settings"); await tap("Địa chỉ API");
  adb("shell", "input", "keycombination", "113", "29"); adb("shell", "input", "keyevent", "67");
  for (const c of value) { adb("shell", "input", "text", c); await pause(50); }
  adb("shell", "input", "keyevent", "4");
  assert.equal((await wait("Địa chỉ API")).text, value);
  await tap("Lưu cài đặt", true); await pause(1200);
}
const marker = `native-oauth-${randomBytes(8).toString("hex")}`, email = `${marker}@example.invalid`;
const hash = s => createHash("sha256").update(s).digest("hex");
const report = { at: new Date().toISOString(), provider: "simulated Google identity; real system browser, app proof, API exchange and PostgreSQL", checks: [] };
let captured = null, originalApi = null;
const stateHashes = [], codeHashes = [];
const realFetch = globalThis.fetch;
const server = http.createServer(async (req, res) => {
  try {
    const chunks = []; for await (const c of req) chunks.push(c);
    const response = await realFetch("http://127.0.0.1:4000" + req.url, {
      method: req.method, headers: { "content-type": req.headers["content-type"] || "application/json", ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}) },
      body: chunks.length ? Buffer.concat(chunks) : undefined, redirect: "manual",
    });
    const body = Buffer.from(await response.arrayBuffer());
    if (req.url === "/api/auth/mobile/oauth/google" && response.ok) captured = JSON.parse(body.toString()).url;
    res.writeHead(response.status, { "content-type": response.headers.get("content-type") || "application/json" }); res.end(body);
  } catch { res.writeHead(502).end(); }
});
const db = new PrismaService();
(async () => {
  await db.$connect();
  await new Promise(r => server.listen(8093, "127.0.0.1", r));
  try {
    adb("shell", "am", "force-stop", "vn.soma.mobile");
    adb("shell", "am", "start", "-W", "-n", "vn.soma.mobile/.MainActivity");
    await wait("Cá nhân"); launch("profile");
    await wait("Chưa đăng nhập"); // Refuse to replace a real account on this emulator.
    launch("settings");
    const configuredApi = (await wait("Địa chỉ API")).text;
    assert.match(configuredApi, /^https?:\/\//);
    originalApi = configuredApi;
    await setApi("http://10.0.2.2:8093/api");
    await db.user.create({ data: { name: marker, email, googleId: marker } });
    for (const cold of [false, true]) {
      captured = null; launch("auth?next=profile");
      let button;
      for (let i=0; i<12; i++) {
        button = await wait("Tiếp tục với Google", true);
        if (button.enabled === "true") break;
        await pause(500);
      }
      assert.equal(button.enabled, "true", "Google capability must finish loading before native login");
      shot(cold ? "login-second" : "login"); await tap("Tiếp tục với Google", true);
      for (let i=0; i<60 && !captured; i++) await pause(250);
      assert(captured, "Native Google button must start a real backend OAuth state");
      const state = new URL(captured).searchParams.get("state"); stateHashes.push(hash(state));
      await pause(1500);
      const browser = adb("shell", "dumpsys", "activity", "activities");
      assert.match(browser, /com\.android\.chrome|org\.chromium|com\.android\.browser/, "System browser must be launched");
      if (cold) adb("shell", "am", "force-stop", "vn.soma.mobile");
      globalThis.fetch = async input => {
        const url = new URL(String(input)); assert(["oauth2.googleapis.com", "openidconnect.googleapis.com"].includes(url.hostname));
        return new Response(JSON.stringify(url.hostname === "oauth2.googleapis.com" ? { access_token: "fixture" } : { sub: marker, name: marker, email, email_verified: true }));
      };
      let returned;
      try { returned = (await new AuthController(new AuthService(db, { configured: false })).oauthCallback("google", "fixture-code", state)).url; }
      finally { globalThis.fetch = realFetch; }
      const callback = new URL(returned); codeHashes.push(hash(callback.searchParams.get("code")));
      // Quote the whole URI for Android's remote shell so '&' is never a command separator.
      adb("shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", `'${returned}'`, "vn.soma.mobile");
      await wait(marker); await wait(email); shot(cold ? "cold-login-success" : "warm-login-success");
      report.checks.push(cold ? "cold return uses SecureStore proof after app process restart" : "Google button opens system browser; warm return exchanges PKCE code into shared account");
      // Switching only the disposable API context signs this QA identity out locally.
      if (!cold) { await setApi(originalApi); await setApi("http://10.0.2.2:8093/api"); }
    }
    report.passed = true;
  } catch (e) { report.passed = false; report.error = e.message; shot("failure"); throw e; }
  finally {
    globalThis.fetch = realFetch;
    if (originalApi) { try { await setApi(originalApi); } catch (e) { report.restoreError = e.message; } }
    await db.oAuthState.deleteMany({ where: { stateHash: { in: stateHashes } } });
    await db.mobileOAuthCode.deleteMany({ where: { codeHash: { in: codeHashes } } });
    await db.user.deleteMany({ where: { email, name: marker, googleId: marker } });
    report.cleaned = await db.user.count({ where: { email } }) === 0;
    await db.$disconnect(); server.close();
    fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
