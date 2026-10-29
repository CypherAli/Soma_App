import assert from "node:assert/strict";
import { test } from "node:test";
import { gatewayTimeout } from "../scripts/lib/gateway-policy.mjs";

test("assistant gateway leaves time for the 55s upstream deadline before the 65s client deadline", () => {
  const timeout = gatewayTimeout("/api/mobile/assistant");
  assert.ok(timeout > 55_000 && timeout < 65_000);
  assert.equal(gatewayTimeout("/api/auth/login"), 45_000);
  assert.equal(gatewayTimeout("/api/mobile/attempts"), 45_000);
});
