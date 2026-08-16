import assert from "node:assert/strict";
import test from "node:test";
import { createPluginManager } from "../../packages/velodom/src/plugins.ts";
import {
  createDevtoolsPlugin,
  createRequestCache,
  withRequestRetry
} from "../../packages/velodom/src/request-tools.ts";
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

  assert.deepEqual(window.__VD_TEST_DEVTOOLS__.inspect(), {
    sharedStateNames: [
      "ui"
    ]
  });
  assert.equal(window.__VD_TEST_DEVTOOLS__.app, app);

  await manager.destroy();

  assert.equal(window.__VD_TEST_DEVTOOLS__, undefined);
});
