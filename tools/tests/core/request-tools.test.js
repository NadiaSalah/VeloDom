import assert from "node:assert/strict";
import test from "node:test";
import { createPluginManager } from "../../../packages/velodom/src/plugins.ts";
import {
  createDevtoolsPlugin,
  createRequestCache,
  withRequestRetry
} from "../../../packages/velodom/src/request-tools.ts";
import { installDom } from "../../test-support/dom.js";

const removeDom = installDom();

test.after(() => {
  removeDom();
});

test("request cache caches GET requests and leaves mutations uncached", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  const cache = createRequestCache();

  globalThis.fetch = async () => {
    calls += 1;

    return new Response(JSON.stringify({
      calls
    }), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  };

  try {
    assert.deepEqual(await cache.requestJson("https://example.test/posts"), {
      calls: 1
    });
    assert.deepEqual(await cache.requestJson("https://example.test/posts"), {
      calls: 1
    });
    assert.equal(cache.size, 1);

    assert.deepEqual(await cache.requestJson("https://example.test/posts", {
      method: "POST",
      body: {
        title: "New"
      }
    }), {
      calls: 2
    });
    assert.deepEqual(await cache.requestJson("https://example.test/posts", {
      method: "POST",
      body: {
        title: "New"
      }
    }), {
      calls: 3
    });

    cache.clear();
    assert.equal(cache.size, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("request retry wrapper retries explicit handler failures", async () => {
  let attempts = 0;
  const handler = withRequestRetry(async () => {
    attempts += 1;

    if (attempts < 3) {
      throw new Error("Temporary failure");
    }

    return {
      ok: true
    };
  }, {
    retries: 2
  });

  assert.deepEqual(await handler({}, {
    signal: new AbortController().signal
  }), {
    ok: true
  });
  assert.equal(attempts, 3);
});

test("clearing the request cache fences an older pending read", async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const cache = createRequestCache();
  let finish;
  globalThis.fetch = () => new Promise(resolve => { finish = resolve; });
  const pending = cache.requestJson("/catalog");

  cache.clear();
  finish(jsonResponse({ revision: 1 }));
  assert.deepEqual(await pending, { revision: 1 });
  assert.equal(cache.size, 0, "a stale completion must not repopulate an invalidated cache");
});

test("identical pending GETs coalesce with independently abortable consumers", async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let calls = 0;
  let finish;
  let transportSignal;
  globalThis.fetch = (_url, options) => {
    calls++;
    transportSignal = options.signal;
    return new Promise(resolve => { finish = resolve; });
  };
  const cache = createRequestCache();
  const controller = new AbortController();
  const first = cache.requestJson("/catalog", { signal: controller.signal });
  const rejected = assert.rejects(first, { name: "AbortError" });
  const second = cache.requestJson("/catalog");

  controller.abort();
  assert.equal(calls, 1);
  assert.equal(transportSignal.aborted, false, "one consumer cannot abort another's read");
  finish(jsonResponse({ revision: 2 }));
  await rejected;
  assert.deepEqual(await second, { revision: 2 });
  assert.equal(cache.size, 1);
});

test("scope changes fence private pending responses, including switch-back", async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let scope = "north:user-a:session-1";
  const completions = [];
  globalThis.fetch = () => new Promise(resolve => { completions.push(resolve); });
  const cache = createRequestCache({ scope: () => scope });
  const first = cache.requestJson("/account");
  scope = "south:user-b:session-2";
  const second = cache.requestJson("/account");
  scope = "north:user-a:session-1";
  const third = cache.requestJson("/account");

  completions[0](jsonResponse({ user: "old-a" }));
  await first;
  assert.equal(cache.size, 0);
  completions[1](jsonResponse({ user: "b" }));
  await second;
  assert.equal(cache.size, 0);
  completions[2](jsonResponse({ user: "new-a" }));
  assert.deepEqual(await third, { user: "new-a" });
  assert.deepEqual(await cache.requestJson("/account"), { user: "new-a" });
});

test("cache identity includes request headers and credentials", async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let calls = 0;
  globalThis.fetch = async () => jsonResponse({ calls: ++calls });
  const cache = createRequestCache();
  const url = "/account";

  assert.deepEqual(await cache.requestJson(url, { headers: { Authorization: "A" } }), { calls: 1 });
  assert.deepEqual(await cache.requestJson(url, { headers: { authorization: "B" } }), { calls: 2 });
  assert.deepEqual(await cache.requestJson(url, { headers: { authorization: "A" } }), { calls: 1 });
  assert.deepEqual(await cache.requestJson(url, { headers: { Authorization: "A" }, credentials: "omit" }), { calls: 3 });
  cache.clear("GET /account");
  assert.equal(cache.size, 0, "the legacy default base key clears every header variant");
});

test("request cache bounds memory using LRU and rejects aborted cache hits", async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let calls = 0;
  globalThis.fetch = async () => jsonResponse({ calls: ++calls });
  const cache = createRequestCache({ maxEntries: 2 });
  await cache.requestJson("/one");
  await cache.requestJson("/two");
  await cache.requestJson("/one");
  await cache.requestJson("/three");
  assert.equal(cache.size, 2);
  assert.deepEqual(await cache.requestJson("/one"), { calls: 1 });
  assert.deepEqual(await cache.requestJson("/two"), { calls: 4 });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(cache.requestJson("/two", { signal: controller.signal }), { name: "AbortError" });
  assert.equal(calls, 4);
});

function jsonResponse(value) {
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json" }
  });
}

test("the last cancellation aborts transport and fences ignored-abort completion", async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let transportSignal;
  let finish;
  globalThis.fetch = (_url, options) => {
    transportSignal = options.signal;
    return new Promise(resolve => { finish = resolve; });
  };
  const cache = createRequestCache();
  const controller = new AbortController();
  const pending = cache.requestJson("/catalog", { signal: controller.signal });
  const rejected = assert.rejects(pending, { name: "AbortError" });
  controller.abort();
  assert.equal(transportSignal.aborted, true);
  finish(jsonResponse({ ignoredAbort: true }));
  await rejected;
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(cache.size, 0);
});

test("failed reads are evicted and failed writes preserve cached reads until explicit clear", async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let calls = 0;
  globalThis.fetch = async (_url, options) => {
    calls++;
    return options.method === "POST" || calls === 1
      ? new Response('{"message":"failed"}', { status: 500 })
      : jsonResponse({ revision: calls });
  };
  const cache = createRequestCache();
  await assert.rejects(cache.requestJson("/catalog"));
  assert.equal(cache.size, 0);
  assert.deepEqual(await cache.requestJson("/catalog"), { revision: 2 });
  await assert.rejects(cache.requestJson("/catalog", { method: "POST", body: {} }));
  assert.deepEqual(await cache.requestJson("/catalog"), { revision: 2 });
  assert.equal(calls, 3);
  cache.clear("GET /catalog");
  assert.deepEqual(await cache.requestJson("/catalog"), { revision: 4 });
});

test("custom-key invalidation fences old work without deleting a newer read", async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const completions = [];
  globalThis.fetch = () => new Promise(resolve => { completions.push(resolve); });
  const cache = createRequestCache({ key: () => "catalog" });
  const first = cache.requestJson("/catalog");
  cache.clear("catalog");
  const second = cache.requestJson("/catalog");
  completions[0](jsonResponse({ revision: 1 }));
  await first;
  assert.equal(cache.size, 0);
  completions[1](jsonResponse({ revision: 2 }));
  await second;
  assert.deepEqual(await cache.requestJson("/catalog"), { revision: 2 });
});

test("TTL pruning, disabled cache and option validation retain the legacy zero-TTL contract", async t => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  t.after(() => { globalThis.fetch = originalFetch; Date.now = originalNow; });
  let now = 1_000;
  let calls = 0;
  Date.now = () => now;
  globalThis.fetch = async () => jsonResponse({ calls: ++calls });
  const cache = createRequestCache({ ttlMs: 10 });
  await cache.requestJson("/catalog");
  now += 10;
  assert.equal(cache.size, 0);
  await cache.requestJson("/catalog");
  const retained = createRequestCache({ ttlMs: 0 });
  await retained.requestJson("/forever");
  now += 1_000_000;
  assert.deepEqual(await retained.requestJson("/forever"), { calls: 3 });
  const disabled = createRequestCache({ maxEntries: 0 });
  await disabled.requestJson("/disabled");
  await disabled.requestJson("/disabled");
  assert.equal(disabled.size, 0);
  assert.equal(calls, 5);
  assert.throws(() => createRequestCache({ maxEntries: -1 }), /maxEntries/);
  assert.throws(() => createRequestCache({ maxEntries: 1.5 }), /maxEntries/);
  assert.throws(() => createRequestCache({ ttlMs: Infinity }), /TTL/);
});

test("bounded in-flight tracking bypasses saturated entries instead of dropping reads", async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  const completions = [];
  globalThis.fetch = () => new Promise(resolve => { completions.push(resolve); });
  const cache = createRequestCache({ maxEntries: 1 });
  const first = cache.requestJson("/one");
  const second = cache.requestJson("/two");
  completions[1](jsonResponse({ id: 2 }));
  assert.deepEqual(await second, { id: 2 });
  assert.equal(cache.size, 0);
  completions[0](jsonResponse({ id: 1 }));
  await first;
  assert.equal(cache.size, 1);
});

test("request retry wrapper stops when shouldRetry rejects the error", async () => {
  let attempts = 0;
  const handler = withRequestRetry(async () => {
    attempts += 1;
    throw new Error("Permanent failure");
  }, {
    retries: 5,
    shouldRetry() {
      return false;
    }
  });

  await assert.rejects(
    () => handler({}, {
      signal: new AbortController().signal
    }),
    /Permanent failure/
  );
  assert.equal(attempts, 1);
});

test("retry does not call a handler for an already cancelled request", async () => {
  let calls = 0;
  const controller = new AbortController();
  controller.abort();
  const handler = withRequestRetry(() => { calls++; return "unexpected"; });

  await assert.rejects(handler({}, { signal: controller.signal }), { name: "AbortError" });
  assert.equal(calls, 0);
});

test("retry never repeats an AbortError, even without a cancelled context signal", async () => {
  let calls = 0;
  let policyCalls = 0;
  const abort = new Error("transport cancelled");
  abort.name = "AbortError";
  const handler = withRequestRetry(() => {
    calls++;
    throw abort;
  }, { retries: 3, shouldRetry: () => { policyCalls++; return true; } });

  await assert.rejects(handler({}, {}), error => error === abort);
  assert.equal(calls, 1);
  assert.equal(policyCalls, 0);
});

test("cancelling during a retry wait stops the next handler attempt", async () => {
  let calls = 0;
  const controller = new AbortController();
  const handler = withRequestRetry(() => {
    calls++;
    if (calls === 1) throw new Error("temporary");
    return "unexpected retry";
  }, {
    retries: 2,
    delayMs: 25,
    shouldRetry: () => {
      queueMicrotask(() => controller.abort());
      return true;
    }
  });

  await assert.rejects(handler({}, { signal: controller.signal }), { name: "AbortError" });
  assert.equal(calls, 1);
});

test("retry wait removes its abort listener on successful completion", async () => {
  const controller = new AbortController();
  const signal = controller.signal;
  const add = signal.addEventListener.bind(signal);
  const remove = signal.removeEventListener.bind(signal);
  let listeners = 0;
  let subscriptions = 0;
  signal.addEventListener = (name, ...args) => { if (name === "abort") { listeners++; subscriptions++; } add(name, ...args); };
  signal.removeEventListener = (name, ...args) => { if (name === "abort") listeners--; remove(name, ...args); };
  let calls = 0;
  const handler = withRequestRetry(() => {
    calls++;
    if (calls === 1) throw new Error("temporary");
    return "recovered";
  }, { delayMs: 1 });

  assert.equal(await handler({}, { signal }), "recovered");
  assert.equal(subscriptions, 1);
  assert.equal(listeners, 0);
});

test("retry discards an ignored-abort completion without starting another attempt", async () => {
  let finish;
  let calls = 0;
  const controller = new AbortController();
  const handler = withRequestRetry(() => {
    calls++;
    return new Promise(resolve => { finish = resolve; });
  }, { retries: 3 });
  const pending = handler({}, { signal: controller.signal });
  controller.abort();
  finish("late result");
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(calls, 1);
});

test("devtools bridge installs only through its plugin", async () => {
  const app = {
    shared: {
      ui: {}
    }
  };
  const navigate = async () => {};
  const manager = createPluginManager([
    createDevtoolsPlugin({
      globalName: "__VD_TEST_DEVTOOLS__"
    })
  ], () => ({
    app,
    navigate
  }));

  assert.equal(window.__VD_TEST_DEVTOOLS__, undefined);

  await manager.setup();

  const snapshot = window.__VD_TEST_DEVTOOLS__.inspect();

  assert.deepEqual(snapshot.sharedStateNames, ["ui"]);
  assert.equal(snapshot.protocolVersion, 1);
  assert.equal(snapshot.scopes[0].kind, "shared");
  assert.equal(snapshot.scopes[0].name, "ui");
  assert.equal(window.__VD_TEST_DEVTOOLS__.protocolVersion, 1);
  assert.equal(window.__VD_TEST_DEVTOOLS__.app, app);

  await manager.destroy();

  assert.equal(window.__VD_TEST_DEVTOOLS__, undefined);
});
