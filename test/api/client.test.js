import assert from "node:assert/strict";
import test from "node:test";
import {
  ApiError,
  requestJson
} from "../../src/core/requests/index.js";
import { toPositiveInteger } from "../../src/api/validation.js";

test("positive integer validation rejects empty and zero values", () => {
  assert.throws(() => toPositiveInteger(""), /positive integer/);
  assert.throws(() => toPositiveInteger(0), /positive integer/);
  assert.equal(toPositiveInteger("12"), 12);
});

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
