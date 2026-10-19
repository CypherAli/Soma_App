const { execFileSync } = require("node:child_process");
const { createRequire } = require("node:module");
const { randomUUID, createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const assert = require("node:assert/strict");
const { PNG } = require("pngjs");
const adbPath =
  process.env.ADB_PATH ||
  path.join(
    process.env.ANDROID_HOME ||
      path.join(os.homedir(), "AppData/Local/Android/Sdk"),
    "platform-tools/adb.exe",
  );
const device = process.env.ANDROID_QA_DEVICE || "emulator-5554";
if (!device.startsWith("emulator-"))
  throw new Error(
    "This QA harness is limited to an emulator: it clears only vn.soma.mobile test data when finished.",
  );
const backendRequire = createRequire(
  path.resolve(__dirname, "../../soma_be/package.json"),
);
backendRequire("dotenv").config({
  path: path.resolve(__dirname, "../../soma_be/.env"),
  quiet: true,
});
const { Client } = backendRequire("pg");
const base = process.env.MOBILE_QA_API_URL || "http://localhost:4000/api";
const output = path.resolve(__dirname, "../qa/android");
fs.mkdirSync(output, { recursive: true });
let viewport = { width: 1080, height: 2400 };
const checks = [];
const passed = (check) => {
  checks.push(check);
  console.log(`PASS: ${check}`);
};
function adb(...args) {
  return execFileSync(adbPath, ["-s", device, ...args], {
    encoding: "utf8",
    timeout: 30000,
    windowsHide: true,
  });
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function typeText(value) {
  // ADB's burst input can outrun controlled TextInput on a busy emulator.
  for (const character of value) {
    adb("shell", "input", "text", character);
    await pause(180);
  }
}
const decode = (text) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
function hierarchy() {
  adb("shell", "rm", "-f", "/sdcard/soma-qa.xml");
  const result = adb("shell", "uiautomator", "dump", "--compressed", "/sdcard/soma-qa.xml");
  if (!result.includes("UI hierchary dumped")) return [];
  const xml = adb("shell", "cat", "/sdcard/soma-qa.xml");
  return [...xml.matchAll(/<node\s+([^>]+)>?/g)].map((match) => {
    const attrs = Object.fromEntries(
      [...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [
        m[1],
        decode(m[2]),
      ]),
    );
    const bounds = attrs.bounds?.match(/\d+/g)?.map(Number) || [0, 0, 0, 0];
    return {
      ...attrs,
      bounds,
      label: (attrs["content-desc"] || attrs.text || "").trim(),
    };
  });
}
function visible(node) {
  const [x, y, r, b] = node.bounds;
  return r > x && b > y && y >= viewport.height * 0.02 && b <= viewport.height * 0.98;
}
function screenshot(name, region) {
  const file = path.join(output, name + ".png");
  fs.writeFileSync(
    file,
    execFileSync(adbPath, ["-s", device, "exec-out", "screencap", "-p"], {
      timeout: 15000,
      windowsHide: true,
    }),
  );
  const png = PNG.sync.read(fs.readFileSync(file));
  if (!region) return createHash("sha256").update(png.data).digest("hex");
  const [x, y, r, b] = region.map(Math.round);
  const hash = createHash("sha256");
  for (let row = y; row < b; row++)
    hash.update(png.data.subarray((row * png.width + x) * 4, (row * png.width + r) * 4));
  return hash.digest("hex");
}
function swipe(x1, y1, x2, y2, duration = 350) {
  adb("shell", "input", "swipe", ...[x1 * viewport.width, y1 * viewport.height,
    x2 * viewport.width, y2 * viewport.height, duration].map((n) => String(Math.round(n))));
}
async function waitFor(label, timeout = 45000) {
  const deadline = Date.now() + timeout;
  do {
    const nodes = hierarchy();
    const node = nodes.find((n) => n.label === label || n.text === label);
    if (node) return node;
    await pause(300);
  } while (Date.now() < deadline);
  throw new Error(`Android UI did not show: ${label}`);
}
async function tapLabel(
  label,
  { last = false, contains = false, scroll = false } = {},
) {
  for (let attempt = 0; attempt < (scroll ? 9 : 3); attempt++) {
    const nodes = hierarchy().filter(
      (n) =>
        n.enabled !== "false" &&
        (contains
          ? n.label.includes(label)
          : n.label === label || n.text === label) &&
        visible(n),
    );
    const clickable = nodes.filter((n) => n.clickable === "true");
    const candidates = clickable.length ? clickable : nodes;
    const node = last ? candidates.at(-1) : candidates[0];
    if (node) {
      const [x, y, r, b] = node.bounds;
      adb(
        "shell",
        "input",
        "tap",
        String(Math.round((x + r) / 2)),
        String(Math.round((y + b) / 2)),
      );
      await pause(250);
      return;
    }
    if (scroll)
      swipe(0.5, 0.77, 0.5, 0.35);
    await pause(250);
  }
  throw new Error(`Android control not available: ${label}`);
}
function launch(route = "") {
  if (route)
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
  else adb("shell", "am", "start", "-W", "-n", "vn.soma.mobile/.MainActivity");
}
async function api(route, body, token) {
  const response = await fetch(base + route, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  assert.ok(response.ok, `${route} returned ${response.status}`);
  return response.json();
}
(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  let account, email;
  try {
    assert.equal(adb("get-state").trim(), "device");
    assert.equal(adb("shell", "getprop", "sys.boot_completed").trim(), "1", "Emulator must finish booting before QA");
    const size = [...adb("shell", "wm", "size").matchAll(/(\d+)x(\d+)/g)].at(-1);
    assert.ok(size, "Android viewport must be available");
    viewport = { width: Number(size[1]), height: Number(size[2]) };
    adb("shell", "am", "force-stop", "vn.soma.mobile");
    assert.match(adb("shell", "pm", "clear", "vn.soma.mobile"), /Success/);
    launch();
    await waitFor("Mở Atlas");
    screenshot("home");
    passed("standalone APK launch");
    launch("atlas/ban-tay");
    await waitFor("Cấu trúc (54)", 60000);
    await waitFor("Tay phải");
    screenshot("viewer");
    passed("native WebView GLB/Draco");
    await tapLabel("Tay trái");
    await tapLabel("Hai tay");
    await pause(800);
    screenshot("viewer-both");
    await tapLabel("Tay phải");
    passed("left and right hand controls");
    const webview = hierarchy().find((n) => n.class === "android.webkit.WebView");
    assert.ok(webview, "Native 3D WebView must be accessible");
    const [vx, vy, vr, vb] = webview.bounds;
    const region = [vx + 10, vy + 10, vr - 10, vb - 10];
    await pause(1500);
    const before = screenshot("before-orbit", region);
    swipe(0.43, (vy + vb) / 2 / viewport.height, 0.66, (vy + vb) / 2 / viewport.height, 500);
    await pause(1500);
    assert.notEqual(before, screenshot("after-orbit", region), "3D canvas pixels must change after touch orbit");
    assert.ok(hierarchy().some((n) => n.class === "android.webkit.WebView"), "App must remain in the 3D viewer after the gesture");
    passed("touch orbit changes canvas");
    await tapLabel("Lưu mô hình");
    await waitFor("Bỏ lưu mô hình");
    passed("local bookmark");
    await tapLabel("Cấu trúc (54)");
    await waitFor("Cấu trúc giải phẫu");
    screenshot("structure-sheet");
    await tapLabel("Đóng bảng thông tin");
    await tapLabel("Thông tin mô hình");
    await waitFor("Đóng bảng thông tin");
    screenshot("information-sheet");
    await tapLabel("Đóng bảng thông tin");
    passed("native structure and information sheets");
    const password = `Qa1_${randomUUID().slice(0, 12)}`;
    email = `mobile-android-${randomUUID().slice(0, 8)}@example.invalid`;
    account = await api("/auth/register", {
      name: "Mobile Android QA",
      email,
      password,
    });
    launch("auth?next=profile");
    await waitFor("Email");
    await tapLabel("Email");
    await pause(700);
    await typeText(email);
    assert.ok(hierarchy().some((n) => n.class === "android.widget.EditText" && n.text === email), "Native email input must contain the full QA address");
    await tapLabel("Mật khẩu");
    await pause(700);
    await typeText(password);
    adb("shell", "input", "keyevent", "4");
    await tapLabel("Đăng nhập", { last: true, scroll: true });
    await waitFor("Mobile Android QA");
    passed("native login");
    adb("shell", "am", "force-stop", "vn.soma.mobile");
    launch();
    // Wait for the restored app before navigating; an intent sent during
    // bootstrap can arrive before the router has mounted.
    await waitFor("Cá nhân");
    await tapLabel("Cá nhân");
    await waitFor("Mobile Android QA");
    screenshot("restored-session");
    passed("SecureStore session after process restart");
    const catalog = await api("/mobile/bootstrap");
    await tapLabel("Ôn tập");
    await waitFor("Luyện tập theo chủ đề");
    await tapLabel("Bắt đầu luyện tập", { scroll: true });
    for (let index = 0; index < 10; index++) {
      await waitFor(`${index + 1} / 10`);
      const labels = hierarchy().map((n) => n.label);
      const question = catalog.questions.find((q) =>
        labels.some((label) => label.includes(q.prompt)),
      );
      assert.ok(question, "Native question must match published content");
      const answer = question.options.find(
        (o) => o.id === question.correctOptionId,
      );
      await tapLabel(answer.text, { contains: true, scroll: true });
      await tapLabel("Xác nhận đáp án", { scroll: true });
      if (index === 0) screenshot("quiz");
      await tapLabel(index === 9 ? "Hoàn thành bài làm" : "Câu tiếp theo", {
        scroll: true,
      });
      console.log(`Native practice: ${index + 1}/10 answers confirmed`);
      if (index === 1) {
        adb("shell", "am", "force-stop", "vn.soma.mobile");
        launch();
        await waitFor("Ôn tập");
        await tapLabel("Ôn tập");
        await waitFor("Tiếp tục bài đang làm · 2/10");
        screenshot("restored-draft");
        await tapLabel("Tiếp tục bài đang làm · 2/10", { scroll: true });
        passed("draft after process restart");
      }
    }
    await waitFor("Đã đồng bộ");
    screenshot("result");
    passed("10-question practice and native sync receipt");
    const history = await api("/study/history", undefined, account.token);
    assert.equal(history.attempts.length, 1);
    assert.equal(history.attempts[0].score, 10);
    passed("server history 10/10 exactly once");
    fs.writeFileSync(
      path.join(output, "report.json"),
      JSON.stringify(
        {
          passed: true,
          checkedAt: new Date().toISOString(),
          device,
          viewport,
          checks,
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: Android APK, 3D, native authentication, process restart persistence and shared history.",
    );
  } catch (error) {
    try { screenshot("failure"); } catch { /* Preserve the original failure if ADB is unavailable. */ }
    try {
      fs.writeFileSync(path.join(output, "failure-exit-info.txt"), adb("shell", "dumpsys", "activity", "exit-info", "vn.soma.mobile"));
      fs.writeFileSync(path.join(output, "failure-crash-log.txt"), adb("logcat", "-d", "-b", "crash", "-t", "120"));
    } catch { /* Emulator diagnostics are best effort. */ }
    fs.writeFileSync(path.join(output, "report.json"), JSON.stringify({
      passed: false, checkedAt: new Date().toISOString(), device, viewport, checks, error: error.message,
    }, null, 2));
    throw error;
  } finally {
    try {
      if (account)
        await db.query("DELETE FROM users WHERE id=$1 AND email=$2", [
          account.user.id,
          email,
        ]);
    } finally {
      await db.end();
      try {
        adb("shell", "am", "force-stop", "vn.soma.mobile");
        adb("shell", "pm", "clear", "vn.soma.mobile");
        launch();
      } catch (error) {
        console.error(`Emulator cleanup unavailable: ${error.message}`);
      }
    }
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
