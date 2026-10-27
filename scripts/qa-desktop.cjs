const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const checks = [
  "qa-layout.cjs",
  "qa-atlas.cjs",
  "qa-auth-web.cjs",
  "qa-account-api.cjs",
  "qa-account-ui.cjs",
  "qa-desktop-oauth.cjs",
  "qa-learning.cjs",
];
for (const script of checks) {
  console.log(`\nSoma desktop QA: ${script}`);
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log("PASS: complete desktop integration QA");
