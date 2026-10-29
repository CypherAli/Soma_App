import { appRoot } from "./lib/desktop.mjs";
import { buildOfflineViewer } from "./lib/viewer-build.mjs";

const check = process.argv.includes("--check");
await buildOfflineViewer(appRoot, { check });
console.log(
  check
    ? "PASS: bundled offline viewer matches source"
    : "Built standalone offline viewer and template",
);
