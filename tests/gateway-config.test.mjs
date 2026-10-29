import assert from "node:assert/strict";
import { test } from "node:test";
import { gatewayConfig } from "../scripts/lib/gateway-config.mjs";

test("gateway keeps local preview on loopback and requires explicit production allowlist", () => {
  assert.equal(gatewayConfig({}, process.cwd()).host, "127.0.0.1");
  assert.throws(
    () =>
      gatewayConfig(
        { NODE_ENV: "production", SOMA_UPSTREAM_URL: "http://backend:4000" },
        process.cwd(),
      ),
    /ALLOWLIST/,
  );
  assert.throws(
    () =>
      gatewayConfig(
        {
          NODE_ENV: "production",
          SOMA_MOBILE_ALLOWLIST: "deploy/mobile-allowlist.json",
        },
        process.cwd(),
      ),
    /UPSTREAM/,
  );
  const result = gatewayConfig(
    {
      NODE_ENV: "production",
      PORT: "4500",
      SOMA_MOBILE_ALLOWLIST: "deploy/mobile-allowlist.json",
      SOMA_UPSTREAM_URL: "http://backend.railway.internal:4000",
    },
    process.cwd(),
  );
  assert.equal(result.host, "::");
  assert.equal(result.port, 4500);
  assert.equal(result.upstream.hostname, "backend.railway.internal");
});

test("gateway rejects malformed upstream or listen configuration", () => {
  for (const value of [
    "file:///etc/passwd",
    "https://u:p@host",
    "https://host/api",
    "http://host/?x=1",
    "https://host/#x",
  ])
    assert.throws(() =>
      gatewayConfig({ SOMA_UPSTREAM_URL: value }, process.cwd()),
    );
  for (const value of ["0", "65536", "1.5", "NaN"])
    assert.throws(() => gatewayConfig({ PORT: value }, process.cwd()));
});
