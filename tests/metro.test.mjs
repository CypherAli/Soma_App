import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const config = require("../metro.config.js");
test("Metro excludes generated QA/installations and builds while retaining app and offline inputs", () => {
  const blocked = (path) =>
    config.resolver.blockList.some((pattern) => pattern.test(resolve(path)));
  assert.equal(
    blocked("qa/standalone-checkout/node_modules/expo/package.json"),
    true,
  );
  assert.equal(blocked("builds/desktop-web/index.html"), true);
  assert.equal(blocked("src/screens/ViewerScreen.tsx"), false);
  assert.equal(blocked("assets/offline/runtime.soma"), false);
});
