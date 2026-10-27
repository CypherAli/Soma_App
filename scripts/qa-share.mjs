import assert from "node:assert/strict";
import { allowed } from "./share-preview.mjs";
import { readFileSync } from "node:fs";
const manifest = JSON.parse(
  readFileSync(
    new URL("../../soma_be/resources/mobile/manifest.json", import.meta.url),
    "utf8",
  ),
);
const base = process.env.SOMA_QA_SHARE_URL || "http://127.0.0.1:8083";
for (const [pathname, origin, expected] of [
  ["/api/mobile/assistant", "http://localhost:8082", 204],
  ["/api/mobile/source-attempts", "http://localhost:8082", 204],
  ["/api/admin/users", "http://localhost:8082", 403],
  ["/api/mobile/assistant", "https://untrusted.example", 403],
]) {
  const response = await fetch(base + pathname, { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization, content-type" } });
  assert.equal(response.status, expected);
  if (expected === 204) assert.equal(response.headers.get("access-control-allow-origin"), origin);
}
for (const pathname of [
  "/api/admin/users",
  "/.env",
  "/api/docs",
  "/api/auth/sessions",
  "/api/auth/oauth/google",
  "/api/auth/oauth/unknown/callback",
  "/api/personal-docs",
  "/api/mobile/runtime/../.env",
  "/api/mobile/models/unknown/file",
]) {
  assert.equal(allowed("GET", pathname), false);
  assert.equal((await fetch(base + pathname)).status, 404, pathname);
}
assert.equal(
  allowed("POST", "/api/study/attempts"),
  false,
  "Client-graded web submissions stay private",
);
assert.equal(allowed("DELETE", "/api/study/path"), false);
assert.equal(allowed("POST", "/api/auth/mobile/oauth/google"), true);
assert.equal(allowed("POST", "/api/auth/mobile/exchange"), true);
assert.equal(allowed("GET", "/api/auth/oauth/google/callback"), true);
assert.equal(allowed("POST", "/api/auth/oauth/google/link"), false);
assert.equal(allowed("POST", "/api/auth/mobile/oauth/unknown"), false);
assert.equal((await fetch(base + "/api/auth/capabilities")).status, 200);
assert.equal(
  (
    await fetch(base + "/api/auth/mobile/exchange", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "x".repeat(43), verifier: "v".repeat(64) }),
    })
  ).status,
  401,
);
assert.equal(
  (await fetch(base + "/api/auth/me")).status,
  401,
  "Authentication must still be enforced by backend",
);
const catalogue = await fetch(base + "/api/mobile/bootstrap").then((response) =>
  response.json(),
);
assert.equal(catalogue.models.length, manifest.models.length);
assert.ok(catalogue.questions.length > 0);
const large = await fetch(base + "/api/auth/login", {
  method: "POST",
  body: "x".repeat(65537),
});
assert.equal(large.status, 413);
console.log(
  "PASS: mobile-only gateway, private routes blocked, auth retained, request body limit and the complete prepared model catalogue.",
);
