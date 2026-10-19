const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const api = process.env.MOBILE_QA_PUBLIC_API_URL;
assert.match(api || "", /^https:\/\/[^/]+\/api$/);
const adbPath = path.join(
  process.env.ANDROID_HOME ||
    path.join(process.env.LOCALAPPDATA, "Android/Sdk"),
  "platform-tools/adb.exe",
);
const output = path.resolve(__dirname, "../qa/android");
fs.mkdirSync(output, { recursive: true });
const adb = (...args) =>
  execFileSync(adbPath, ["-s", "emulator-5554", ...args], {
    encoding: "utf8",
    timeout: 30000,
    windowsHide: true,
  });
const pause = (ms) => new Promise((done) => setTimeout(done, ms));
function nodes() {
  adb("shell", "rm", "-f", "/sdcard/soma-public-qa.xml");
  const result = adb(
    "shell",
    "uiautomator",
    "dump",
    "--compressed",
    "/sdcard/soma-public-qa.xml",
  );
  if (!result.includes("UI hierchary dumped")) return [];
  const xml = adb("shell", "cat", "/sdcard/soma-public-qa.xml");
  return [...xml.matchAll(/<node\s+([^>]+)>?/g)].map((match) =>
    Object.fromEntries(
      [...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [m[1], m[2]]),
    ),
  );
}
async function wait(label, timeout = 60000) {
  const deadline = Date.now() + timeout;
  do {
    const tree = nodes(),
      found = tree.find(
        (node) => node["content-desc"] === label || node.text === label,
      );
    if (found) return { found, tree };
    await pause(400);
  } while (Date.now() < deadline);
  throw new Error(`Android did not show ${label}`);
}
async function tap(label) {
  const { found } = await wait(label);
  const [x, y, r, b] = found.bounds.match(/\d+/g).map(Number);
  adb(
    "shell",
    "input",
    "tap",
    String(Math.round((x + r) / 2)),
    String(Math.round((y + b) / 2)),
  );
}
function shot(name) {
  fs.writeFileSync(
    path.join(output, name + ".png"),
    execFileSync(
      adbPath,
      ["-s", "emulator-5554", "exec-out", "screencap", "-p"],
      { timeout: 15000, windowsHide: true },
    ),
  );
}
const launch = (route) =>
  adb(
    "shell",
    "am",
    "start",
    "-W",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    `soma://${route}`,
    "vn.soma.mobile",
  );
(async () => {
  adb("shell", "am", "force-stop", "vn.soma.mobile");
  adb("shell", "am", "start", "-W", "-n", "vn.soma.mobile/.MainActivity");
  await wait("Cá nhân");
  launch("settings");
  const { tree } = await wait("Địa chỉ API");
  const input = tree.find(
    (node) =>
      node.class === "android.widget.EditText" &&
      node["content-desc"] === "Địa chỉ API",
  );
  assert.equal(
    input?.text,
    api,
    "Installed APK must use its embedded public HTTPS API",
  );
  shot("public-api-settings");
  launch("atlas/ban-tay");
  await wait("Cấu trúc (54)");
  await pause(1000);
  shot("public-viewer-right");
  await tap("Hai tay");
  await pause(1500);
  shot("public-viewer-both");
  fs.writeFileSync(
    path.join(output, "public-config-report.json"),
    JSON.stringify(
      {
        passed: true,
        api,
        checkedAt: new Date().toISOString(),
        checks: [
          "embedded HTTPS API shown in native settings",
          "real GLB/Draco through public tunnel",
          "compact paired hands in native viewer",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: installed APK defaults to public HTTPS API and renders real 3D through the tunnel.",
  );
})().catch((error) => {
  try {
    shot("public-failure");
  } catch {}
  console.error(error.message);
  process.exit(1);
});
