import { strict as assert } from "node:assert";
import { test } from "node:test";
import { startupApi, expoApiHost } from "../src/core/server";
import { apiRequest, ApiError } from "../src/core/api";

test("Expo uses Metro LAN host, avoids an unusable Expo tunnel host and replaces expired demo URLs", () => {
  const current = "http://192.168.1.12:4000/api";
  const development = { development: true, allowHttp: true };
  assert.equal(expoApiHost("192.168.1.12:8081"), current);
  assert.equal(expoApiHost("demo.exp.direct:80"), "");
  assert.equal(expoApiHost("127.0.0.1:8081"), "");
  assert.equal(
    startupApi("https://expired.trycloudflare.com/api", current, development),
    current,
  );
  assert.equal(
    startupApi("http://10.0.2.2:4000/api", current, development),
    current,
  );
  assert.equal(
    startupApi(current, "https://preview.trycloudflare.com/api", development),
    "https://preview.trycloudflare.com/api",
  );
  assert.equal(
    startupApi("https://api.example.com/api", current, development),
    "https://api.example.com/api",
  );
});
test("an installed app retains its chosen USB, LAN or HTTPS server across restarts while production still rejects HTTP", () => {
  const emulator = "http://10.0.2.2:4000/api";
  for (const stored of [
    "http://127.0.0.1:4000/api",
    "http://192.168.1.20:4000/api",
  ]) {
    const preview = { development: false, allowHttp: true };
    assert.equal(startupApi(stored, emulator, preview), stored);
    assert.equal(startupApi(stored, "", preview), stored);
    assert.equal(
      startupApi(stored, "https://api.example.com/api", {
        development: false,
        allowHttp: false,
      }),
      "https://api.example.com/api",
    );
  }
  const chosen = "https://chosen.trycloudflare.com/api";
  for (const allowHttp of [false, true]) {
    assert.equal(
      startupApi(chosen, emulator, { development: false, allowHttp }),
      chosen,
    );
    assert.equal(
      startupApi(chosen, "https://new.trycloudflare.com/api", {
        development: false,
        allowHttp,
      }),
      chosen,
    );
  }
});
test("API timeout also covers a stalled response body and caller cancellation", async () => {
  const original = global.fetch;
  global.fetch = (async (_input, options) => {
    await new Promise((_resolve, reject) =>
      options!.signal!.addEventListener(
        "abort",
        () => reject(new Error("aborted")),
        { once: true },
      ),
    );
    throw Error("unreachable");
  }) as typeof fetch;
  try {
    await assert.rejects(
      apiRequest("https://api.example.com/api", "/health", { timeoutMs: 20 }),
      (e: unknown) => e instanceof ApiError && e.status === 0,
    );
    global.fetch = (async (_input, options) => ({
      ok: true,
      json: () =>
        new Promise((_resolve, reject) =>
          options!.signal!.addEventListener(
            "abort",
            () => reject(new Error("body aborted")),
            { once: true },
          ),
        ),
    })) as typeof fetch;
    await assert.rejects(
      apiRequest("https://api.example.com/api", "/health", { timeoutMs: 20 }),
      (e: unknown) => e instanceof ApiError && e.status === 0,
    );
    const controller = new AbortController();
    const request = apiRequest("https://api.example.com/api", "/health", {
      signal: controller.signal,
      timeoutMs: 1000,
    });
    await Promise.resolve();
    controller.abort();
    await assert.rejects(
      request,
      (e: unknown) => e instanceof ApiError && e.status === 0,
    );
  } finally {
    global.fetch = original;
  }
});

test("an app upgrade migrates a shipped default without changing an independently chosen server", () => {
  const old = "https://old-preview.example/api",
    current = "https://new-preview.example/api";
  const options = { development: false, allowHttp: false, bundledDefault: old };
  assert.equal(startupApi(old, current, options), current);
  assert.equal(
    startupApi("https://my-server.example/api", current, options),
    "https://my-server.example/api",
  );
  assert.equal(
    startupApi(old, current, {
      ...options,
      bundledDefault: undefined,
      previousDefaults: [old],
    }),
    current,
  );
});
