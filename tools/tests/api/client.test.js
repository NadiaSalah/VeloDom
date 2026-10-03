import assert from "node:assert/strict";
import test from "node:test";
import {
  ApiError,
  requestJson
} from "../../../packages/velodom/src/requests/index.ts";

test("GET requests do not send a JSON content type", async () => {
  const originalFetch = globalThis.fetch;
  let capturedOptions;

  globalThis.fetch = async (url, options) => {
    capturedOptions = options;

    return new Response(JSON.stringify({
      ok: true
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  };

  try {
    const result = await requestJson("https://example.test/data");

    assert.deepEqual(result, {
      ok: true
    });
    assert.equal(capturedOptions.headers["Content-Type"], undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("JSON requests forward supported fetch options without replacing JSON defaults", async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  let capturedOptions;

  globalThis.fetch = async (_url, options) => {
    capturedOptions = options;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  try {
    await requestJson("https://example.test/private", {
      cache: "no-store",
      credentials: "same-origin",
      redirect: "error",
      signal: controller.signal,
      method: "post",
      body: { value: 1 }
    });

    assert.equal(capturedOptions.cache, "no-store");
    assert.equal(capturedOptions.credentials, "same-origin");
    assert.equal(capturedOptions.redirect, "error");
    assert.equal(capturedOptions.signal, controller.signal);
    assert.equal(capturedOptions.method, "POST");
    assert.equal(capturedOptions.body, '{"value":1}');
    assert.equal(capturedOptions.headers.Accept, "application/json");
    assert.equal(capturedOptions.headers["Content-Type"], "application/json");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("204 responses return null", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response(null, {
    status: 204
  });

  try {
    assert.equal(
      await requestJson("https://example.test/no-content"),
      null
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("HTTP failures expose status, URL, and response body", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => new Response(JSON.stringify({
    message: "Not found"
  }), {
    status: 404,
    headers: {
      "Content-Type": "application/json"
    }
  });

  try {
    await assert.rejects(
      requestJson("https://example.test/missing"),
      error => (
        error instanceof ApiError
        && error.status === 404
        && error.url === "https://example.test/missing"
        && error.body.message === "Not found"
      )
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
