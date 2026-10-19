const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

function loadPlaywright() {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE,
    "playwright",
    path.join(
      os.homedir(),
      ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
    ),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch (error) {
      if (error.code !== "MODULE_NOT_FOUND") throw error;
    }
  }
  throw new Error(
    "Install Playwright in your QA environment, or set PLAYWRIGHT_MODULE to its absolute module path.",
  );
}
async function launchBrowser() {
  const { chromium } = loadPlaywright();
  const systemChrome =
    process.platform === "win32"
      ? path.join(
          process.env.ProgramFiles || "C:/Program Files",
          "Google/Chrome/Application/chrome.exe",
        )
      : undefined;
  const executablePath =
    process.env.CHROME_PATH ||
    (systemChrome && fs.existsSync(systemChrome) ? systemChrome : undefined);
  return chromium.launch({
    headless: true,
    executablePath,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
}
module.exports = { launchBrowser };
