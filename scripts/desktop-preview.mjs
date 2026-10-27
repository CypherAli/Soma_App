import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  appRoot,
  desktopWebRoot,
  mobileApiUrl,
  openDesktopWindow,
  previewUrl,
  readHealth,
} from "./lib/desktop.mjs";
import { createPreviewServer } from "./lib/preview-server.mjs";

const open = () => {
  if (process.argv.includes("--open")) openDesktopWindow();
};
const previewRunning =
  (await readHealth(previewUrl + "/_soma/health"))?.service ===
  "soma-desktop-preview";
if (!existsSync(resolve(desktopWebRoot, "index.html"))) {
  const result = spawnSync(process.execPath, ["scripts/build-desktop.mjs"], {
    cwd: appRoot,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
const capabilitiesUrl = mobileApiUrl + "/auth/mobile/capabilities";
if (!(await readHealth(capabilitiesUrl))) {
  spawn(process.execPath, ["scripts/dev-desktop.mjs", "--api-only"], {
    cwd: appRoot,
    stdio: "ignore",
    detached: true,
    windowsHide: true,
  }).unref();
  for (
    let attempt = 0;
    attempt < 60 && !(await readHealth(capabilitiesUrl));
    attempt++
  )
    await new Promise((done) => setTimeout(done, 1000));
  if (!(await readHealth(capabilitiesUrl)))
    throw Error("API local chưa sẵn sàng.");
}
if (previewRunning) {
  open();
  console.log(previewUrl);
  process.exit(0);
}
createPreviewServer(desktopWebRoot)
  .on("error", (error) => {
    console.error(
      error.code === "EADDRINUSE"
        ? "Cổng 8082 đang dùng. Dừng đúng phiên Expo dev rồi chạy lại."
        : error.message,
    );
    process.exitCode = 1;
  })
  .listen(8082, "127.0.0.1", () => {
    console.log(
      `Soma phone preview: ${previewUrl} — packaged web build, no Metro server`,
    );
    open();
  });
