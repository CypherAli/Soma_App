import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { test } from "node:test";

test("deployed mobile gateway proxies health and auth while denying private routes and unknown assets", async () => {
  let requests = 0;
  const upstream = http.createServer((req, res) => {
    requests++;
    res.setHeader("Content-Type", "application/json");
    res.statusCode = req.url === "/api/health?degraded=1" ? 503 : 200;
    res.end(
      JSON.stringify({
        path: req.url,
        authorization: req.headers.authorization,
      }),
    );
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  process.env.SOMA_UPSTREAM_URL = `http://127.0.0.1:${upstream.address().port}`;
  process.env.SOMA_MOBILE_ALLOWLIST = "deploy/mobile-allowlist.json";
  process.env.NODE_ENV = "production";
  const { mobileShareServer: gateway } =
    await import("../scripts/share-preview.mjs");
  gateway.listen(0, "127.0.0.1");
  await once(gateway, "listening");
  const base = `http://127.0.0.1:${gateway.address().port}`;
  try {
    const health = await fetch(base + "/api/health?degraded=1");
    assert.equal(
      health.status,
      503,
      "health reflects database/upstream readiness",
    );
    const account = await fetch(base + "/api/mobile/account", {
      headers: { Authorization: "Bearer test-proof" },
    });
    assert.equal((await account.json()).authorization, "Bearer test-proof");
    const knownModel = await fetch(
      base + "/api/mobile/models/mat-cat-ngang-bung/file",
    );
    assert.equal(knownModel.status, 200);
    const before = requests;
    for (const path of [
      "/api/docs",
      "/api/admin/users",
      "/api/documents",
      "/api/mobile/models/unknown/file",
      "/api/mobile/assets/000000000000000000000000.bin",
    ])
      assert.equal((await fetch(base + path)).status, 404, path);
    assert.equal(requests, before, "denied paths never reach the backend");
    assert.equal(
      (
        await fetch(base + "/api/auth/profile", {
          method: "PATCH",
          body: "x".repeat(65537),
        })
      ).status,
      413,
    );
    assert.equal(
      (
        await fetch(base + "/api/mobile/account", {
          method: "OPTIONS",
          headers: {
            Origin: "https://untrusted.example",
            "Access-Control-Request-Method": "GET",
          },
        })
      ).status,
      403,
    );
    const cors = await fetch(base + "/api/mobile/account", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:8082",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
      },
    });
    assert.equal(cors.status, 204);
    assert.equal(
      cors.headers.get("access-control-allow-origin"),
      "http://localhost:8082",
    );
    assert.equal(requests, before);
  } finally {
    gateway.closeAllConnections();
    upstream.closeAllConnections();
    await Promise.all([
      new Promise((done) => gateway.close(done)),
      new Promise((done) => upstream.close(done)),
    ]);
  }
});
