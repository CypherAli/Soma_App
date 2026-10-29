const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const adbPath = path.join(
  process.env.LOCALAPPDATA,
  "Android/Sdk/platform-tools/adb.exe",
);
const device = process.env.ANDROID_QA_DEVICE || "emulator-5554";
if (!device.startsWith("emulator-"))
  throw Error("Expo QA helper is limited to an emulator.");
const adb = (...args) =>
  execFileSync(adbPath, ["-s", device, ...args], {
    encoding: "utf8",
    timeout: 30000,
    windowsHide: true,
  });
const decode = (value) =>
  value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
function nodes() {
  adb(
    "shell",
    "uiautomator",
    "dump",
    "--compressed",
    "/sdcard/soma-expo-qa.xml",
  );
  const xml = adb("shell", "cat", "/sdcard/soma-expo-qa.xml");
  return [...xml.matchAll(/<node\s+([^>]+)>?/g)].map((match) => {
    const value = Object.fromEntries(
      [...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map((m) => [
        m[1],
        decode(m[2]),
      ]),
    );
    return {
      label: value["content-desc"] || value.text || "",
      text: value.text,
      class: value.class,
      bounds: value.bounds?.match(/\d+/g).map(Number),
    };
  });
}
const [action = "state", value = "expo-state"] = process.argv.slice(2);
module.exports = { adb, nodes };
if (require.main === module) {
  if (action === "open")
    adb(
      "shell",
      "am",
      "start",
      "-a",
      "android.intent.action.VIEW",
      "-d",
      `${process.env.SOMA_EXPO_URL || "exp://192.168.100.35:8081"}/--/${value}`,
      "-p",
      "host.exp.exponent",
    );
  else if (action === "tap") {
    const node = nodes().find((node) => node.label === value);
    if (!node) throw Error("Missing control: " + value);
    const [x0, y0, x1, y1] = node.bounds;
    adb(
      "shell",
      "input",
      "tap",
      String((x0 + x1) >> 1),
      String((y0 + y1) >> 1),
    );
  } else if (action === "state") {
    const output = path.resolve(__dirname, "../qa/expo");
    fs.mkdirSync(output, { recursive: true });
    console.log(
      JSON.stringify(
        nodes().filter((node) => node.label),
        null,
        2,
      ),
    );
    const screenshot = execFileSync(
      adbPath,
      ["-s", device, "exec-out", "screencap", "-p"],
      { timeout: 30000, windowsHide: true, maxBuffer: 12 * 1024 * 1024 },
    );
    const file = path.join(output, path.basename(value) + ".png");
    fs.writeFileSync(file, screenshot);
    console.log("Screenshot: " + file);
  } else throw Error("Unknown action.");
}
