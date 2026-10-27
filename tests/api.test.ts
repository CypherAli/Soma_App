import assert from "node:assert/strict";
import { test } from "node:test";
import { apiRequest, ApiError } from "../src/core/api";

test("API sends JSON primitives and preserves authentication headers", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (_input, init) => {
      assert.equal(init?.body, "false");
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("content-type"), "application/json");
      assert.equal(headers.get("authorization"), "Bearer fixture-token");
      return Response.json({ ok: true });
    };
    assert.deepEqual(
      await apiRequest("https://api.example.test/api", "/example", {
        method: "POST",
        body: false,
        token: "fixture-token",
      }),
      { ok: true },
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("API surfaces validation messages and rejects invalid successful responses", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () =>
      Response.json(
        { message: ["First problem", "Second problem"] },
        { status: 400 },
      );
    await assert.rejects(
      apiRequest("https://api.example.test/api", "/example"),
      (error) =>
        error instanceof ApiError &&
        error.status === 400 &&
        error.message === "First problem\nSecond problem",
    );
    globalThis.fetch = async () =>
      new Response("<html>Proxy error</html>", { status: 200 });
    await assert.rejects(
      apiRequest("https://api.example.test/api", "/example"),
      (error) => error instanceof ApiError && error.status === 502,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test("API forwards cancellation while the response body is still pending", async () => {
  const original = globalThis.fetch,
    controller = new AbortController();
  try {
    globalThis.fetch = async (_input, init) =>
      ({
        ok: true,
        json: () =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener(
              "abort",
              () => reject(new Error("aborted")),
              { once: true },
            );
            controller.abort();
          }),
      }) as Response;
    await assert.rejects(
      apiRequest("https://api.example.test/api", "/example", {
        signal: controller.signal,
      }),
      (error) => error instanceof ApiError && error.status === 0,
    );
  } finally {
    globalThis.fetch = original;
  }
});
