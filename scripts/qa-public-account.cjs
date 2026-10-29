const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const backend = createRequire(
  path.resolve(__dirname, "../../soma_be/package.json"),
);
backend("dotenv").config({
  path: path.resolve(__dirname, "../../soma_be/.env"),
  quiet: true,
});
const { Client } = backend("pg");
const base = process.env.MOBILE_QA_PUBLIC_API_URL;
assert.match(base || "", /^https:\/\/[^/]+\/api$/);
async function api(route, body, token, status = 200) {
  const response = await fetch(base + route, {
    method: body ? "POST" : "GET",
    signal: AbortSignal.timeout(15000),
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  assert.equal(response.status, status, `${route} status`);
  return response.json();
}
(async () => {
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  await db.connect();
  const email = `mobile-public-${randomUUID()}@example.invalid`;
  let account;
  try {
    account = await api(
      "/auth/register",
      { name: "Public Mobile QA", email, password: `Qa1_${randomUUID()}` },
      undefined,
      201,
    );
    const me = await api("/auth/me", undefined, account.token);
    assert.equal(me.user.id, account.user.id);
    const catalogue = await api("/mobile/bootstrap");
    const dto = {
      clientRequestId: randomUUID(),
      scope: "all",
      seconds: 20,
      answers: catalogue.questions.slice(0, 10).map((q) => ({
        itemKey: q.itemKey,
        version: q.version,
        answerId: q.correctOptionId,
      })),
    };
    const [first, retry] = await Promise.all([
      api("/mobile/attempts", dto, account.token, 201),
      api("/mobile/attempts", dto, account.token, 201),
    ]);
    assert.equal(first.id, retry.id);
    assert.equal(first.score, 10);
    assert.equal(first.total, 10);
    const history = await api("/study/history", undefined, account.token);
    assert.equal(history.attempts.length, 1);
    assert.equal(history.attempts[0].score, 10);
    fs.writeFileSync(
      path.resolve(__dirname, "../qa/public-account-report.json"),
      JSON.stringify(
        {
          passed: true,
          checkedAt: new Date().toISOString(),
          base,
          checks: [
            "public HTTPS registration and authenticated profile",
            "public server grading 10/10",
            "concurrent retry exactly once",
            "shared history via public gateway",
          ],
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS: public HTTPS auth, server grading 10/10, concurrent retry and one shared history record.",
    );
  } finally {
    if (account)
      await db.query("DELETE FROM users WHERE id=$1 AND email=$2", [
        account.user.id,
        email,
      ]);
    await db.end();
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
