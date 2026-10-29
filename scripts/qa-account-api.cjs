// Local integration QA: temporary accounts are scoped and removed in finally.
const fs = require("fs"),
  path = require("path"),
  assert = require("assert/strict"),
  { randomUUID, randomBytes, createHash } = require("crypto"),
  { createRequire } = require("module");
const be = createRequire(path.resolve("../soma_be/package.json"));
be("dotenv").config({ path: path.resolve("../soma_be/.env"), quiet: true });
const { Client } = be("pg");
const base = "http://127.0.0.1:8083/api";
const accounts = [],
  states = [];
async function call(route, token, body, method = body ? "POST" : "GET") {
  const response = await fetch(base + route, {
    method,
    headers: {
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    data: await response.json().catch(() => null),
  };
}
(async () => {
  fs.mkdirSync("qa/polish", { recursive: true });
  fs.mkdirSync("qa/presentation", { recursive: true });
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const checks = [];
  try {
    for (let i = 0; i < 2; i++) {
      const email = "qa-polish-" + randomUUID() + "@example.invalid",
        password = "Qa9" + randomBytes(12).toString("hex");
      const r = await call("/auth/register", null, {
        email,
        password,
        name: "QA Polish Account",
      });
      assert.equal(r.status, 201);
      accounts.push({ ...r.data, email, password });
    }
    const [a, b] = accounts;
    assert.equal((await call("/mobile/account")).status, 401);
    assert.equal((await call("/auth/sessions", a.token)).status, 404);
    const overview = await call("/mobile/account", a.token);
    assert.equal(overview.status, 200);
    assert.equal(overview.data.user.id, a.user.id);
    assert.ok(overview.data.user.createdAt);
    assert.equal(overview.data.user.hasPassword, true);
    assert.equal(overview.data.membership.remaining, 10);
    checks.push("Private profile and live quota match web");
    let r = await call(
      "/auth/profile",
      a.token,
      { name: "QA Updated Profile", learningRole: "teacher" },
      "PATCH",
    );
    assert.equal(r.status, 200);
    assert.equal(r.data.user.learningRole, "teacher");
    assert.equal(r.data.user.role, "user");
    r = await call("/auth/profile", a.token, { role: "admin" }, "PATCH");
    assert.equal(r.status, 400);
    checks.push("Profile role is learning-only, privileges cannot be changed");
    const avatar =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j9YQAAAAASUVORK5CYII=";
    r = await call("/auth/profile", a.token, { avatar }, "PATCH");
    assert.equal(r.status, 200);
    assert.equal(r.data.user.avatar, avatar);
    checks.push("Profile avatar saves through bounded mobile gateway");
    const extra = await call("/auth/login", null, {
      email: a.email,
      password: a.password,
    });
    assert.equal(extra.status, 200);
    const aSessions = (await call("/mobile/account/sessions", a.token)).data
        .sessions,
      bSessions = (await call("/mobile/account/sessions", b.token)).data
        .sessions;
    assert.equal(aSessions.length, 2);
    assert.equal(
      (
        await call(
          "/mobile/account/sessions/" + bSessions[0].id,
          a.token,
          null,
          "DELETE",
        )
      ).status,
      404,
    );
    assert.equal((await call("/auth/me", b.token)).status, 200);
    const other = aSessions.find((s) => !s.current);
    assert.equal(
      (
        await call(
          "/mobile/account/sessions/" + other.id,
          a.token,
          null,
          "DELETE",
        )
      ).status,
      200,
    );
    assert.equal((await call("/auth/me", extra.data.token)).status, 401);
    checks.push(
      "Session revocation is account-scoped and keeps current device",
    );
    r = await call("/mobile/account/password", a.token, {
      currentPassword: "incorrect",
      newPassword: "Qa9" + randomUUID(),
    });
    assert.equal(r.status, 400);
    const changed = await call("/mobile/account/password", a.token, {
      currentPassword: a.password,
      newPassword: "Changed9" + randomBytes(12).toString("hex"),
    });
    assert.equal(changed.status, 200);
    a.token = changed.data.token;
    assert.equal((await call("/auth/me", extra.data.token)).status, 401);
    assert.equal((await call("/auth/me", a.token)).status, 200);
    checks.push("Password rotation issues a working replacement session");
    assert.equal(
      (
        await call("/auth/mobile/oauth/google/link", null, {
          challenge: randomBytes(32).toString("base64url"),
          state: randomBytes(32).toString("hex"),
          returnUrl: "soma://oauth",
        })
      ).status,
      401,
    );
    const link = await call("/auth/mobile/oauth/google/link", a.token, {
      challenge: randomBytes(32).toString("base64url"),
      state: randomBytes(32).toString("hex"),
      returnUrl: "soma://oauth",
    });
    assert.equal(link.status, 200);
    const url = new URL(link.data.url),
      hash = createHash("sha256")
        .update(url.searchParams.get("state"))
        .digest("hex");
    states.push(hash);
    const stored = (
      await db.query(
        'SELECT "linkUserId" FROM oauth_states WHERE "stateHash"=$1',
        [hash],
      )
    ).rows[0];
    assert.equal(stored.linkUserId, a.user.id);
    assert.equal(url.searchParams.has("token"), false);
    checks.push("Provider linking binds to the authenticated owner");
    const docId = "qa-doc-" + randomUUID();
    await db.query(
      'INSERT INTO personal_docs (id,"userId",filename,bytes,status,"createdAt") VALUES ($1,$2,$3,1,$4,NOW())',
      [docId, a.user.id, "Đề giải phẫu Dr. Lâm.pdf", "ready"],
    );
    const sources = (await call("/mobile/sources", a.token)).data;
    const doc = sources.personal.find((d) => d.id === "personal-" + docId);
    assert.ok(doc);
    assert.equal(doc.title.includes("Lâm"), false);
    assert.equal(
      (await call("/mobile/sources/personal-" + docId, b.token)).status,
      404,
    );
    checks.push(
      "Source labels are neutral while document ownership is preserved",
    );
    fs.writeFileSync(
      "qa/polish/account-api-report.json",
      JSON.stringify({ checks }, null, 2),
    );
    console.log(checks);
  } finally {
    for (const hash of states)
      await db.query('DELETE FROM oauth_states WHERE "stateHash"=$1', [hash]);
    for (const account of accounts)
      await db.query("DELETE FROM users WHERE id=$1 AND email=$2", [
        account.user.id,
        account.email,
      ]);
    await db.end();
  }
})().catch((cause) => {
  console.error(cause);
  process.exitCode = 1;
});
