import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { appRoot as root, mobileApiUrl } from "./lib/desktop.mjs";
const result = spawnSync(
  process.execPath,
  [
    "node_modules/expo/bin/cli",
    "export",
    "--platform",
    "web",
    "--output-dir",
    "builds/desktop-web",
    "--clear",
    "--max-workers",
    "1",
  ],
  {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
    env: {
      ...process.env,
      EXPO_PUBLIC_API_URL: mobileApiUrl,
      SOMA_ALLOW_HTTP: "1",
      NODE_ENV: "production",
      CI: "1",
    },
  },
);
if (result.status !== 0) process.exit(result.status || 1);
writeFileSync(
  resolve(root, "builds/desktop-web/soma-preview.json"),
  JSON.stringify(
    {
      version: JSON.parse(readFileSync(resolve(root, "package.json"))).version,
      apiUrl: mobileApiUrl,
      builtAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
