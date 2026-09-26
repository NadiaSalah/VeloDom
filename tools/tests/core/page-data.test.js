import assert from "node:assert/strict";
import test from "node:test";
import {
  createPageDataCache,
  consumePageDataTransfer,
  loadClientPageData,
  renderPageDataTransfer
} from "../../../packages/velodom/src/page-data.ts";
import { installDom } from "../../test-support/dom.js";

const removeDom = installDom();

test.after(() => {
  removeDom();
});

test.beforeEach(() => {
  document.body.innerHTML = "";
});

test("page data loaders receive one client route contract", async () => {
  const result = await loadClientPageData(
    async () => ({
      load: ({ mode, params, query }) => ({
        mode,
        slug: params.slug,
        filter: query.filter
      })
    }),
    {
      page: "blog/[slug]",
      route: createRoute(),
      params: {
        slug: "html-first"
      },
      query: {
        filter: "recent"
      },
      meta: {}
    }
  );

  assert.deepEqual(result, {
    mode: "client",
    slug: "html-first",
    filter: "recent"
  });
});

test("static page data transfers are route-scoped, safe, and consumed once", () => {
  document.body.innerHTML = renderPageDataTransfer(
    "blog/[slug]",
    "/blog/html-first",
    {
      title: "HTML <First>"
    }
  );

  const transfer = consumePageDataTransfer(
    document,
    "blog/[slug]",
    createRoute()
  );

  assert.equal(transfer.found, true);
  assert.deepEqual(transfer.data, {
    title: "HTML <First>"
  });
  assert.equal(document.querySelector("[data-vd-page-data]"), null);
});

test("static page data rejects non-serializable values", () => {
  const circular = {};

  circular.self = circular;

  assert.throws(
    () => renderPageDataTransfer("home", "/", circular),
    /must be JSON-serializable/
  );
});

test("page data cache is opt-in and route-query scoped", async () => {
  let now = 1_000;
  let calls = 0;
  const cache = createPageDataCache(() => now);
  const loader = async () => ({
    cache: { maxAgeMs: 500 },
    load: () => ({ call: ++calls })
  });
  const context = {
    page: "blog/[slug]",
    route: createRoute(),
    params: { slug: "html-first" },
    query: { filter: "recent" },
    meta: {}
  };

  assert.deepEqual(await loadClientPageData(loader, context, cache), { call: 1 });
  now += 500;
  assert.deepEqual(await loadClientPageData(loader, context, cache), { call: 1 });
  assert.deepEqual(
    await loadClientPageData(loader, { ...context, query: { filter: "popular" } }, cache),
    { call: 2 }
  );
});

test("page data cache rejects unsafe policy values", async () => {
  await assert.rejects(
    () => loadClientPageData(
      async () => ({ cache: { maxAgeMs: -1 }, load: () => null }),
      {
        page: "home",
        route: { ...createRoute(), page: "home" },
        params: {},
        query: {},
        meta: {}
      },
      createPageDataCache()
    ),
    /non-negative maxAgeMs/
  );
});

test("uncached page loaders remain independent", async () => {
  let calls = 0;
  const module = { load: () => ++calls };
  const cache = createPageDataCache();
  assert.deepEqual(await Promise.all([
    cache.load(module, createContext()), cache.load(module, createContext())
  ]), [1, 2]);
});

test("cached cold reads coalesce until their shared load settles", async () => {
  let calls = 0;
  const read = deferred();
  const module = { cache: { maxAgeMs: 500 }, load: () => { calls++; return read.promise; } };
  const cache = createPageDataCache();
  const first = cache.load(module, createContext());
  const second = cache.load(module, createContext());
  await Promise.resolve();
  assert.equal(calls, 1);
  read.resolve("public article");
  assert.deepEqual(await Promise.all([first, second]), ["public article", "public article"]);
  assert.equal(await cache.load(module, createContext()), "public article");
  assert.equal(calls, 1);
});

test("stale page reads share one refresh and use its result on the next visit", async () => {
  let now = 0;
  let calls = 0;
  const refresh = deferred();
  const cache = createPageDataCache(() => now);
  const module = {
    cache: { maxAgeMs: 10, staleWhileRevalidateMs: 100 },
    load: () => ++calls === 1 ? "old article" : refresh.promise
  };
  assert.equal(await cache.load(module, createContext()), "old article");
  now = 20;
  assert.deepEqual(await Promise.all([
    cache.load(module, createContext()), cache.load(module, createContext())
  ]), ["old article", "old article"]);
  assert.equal(calls, 2);
  refresh.resolve("updated article");
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(await cache.load(module, createContext()), "updated article");
  assert.equal(calls, 2);
});

test("background page refresh failure retains freshness age without unhandled rejection", async () => {
  let now = 0;
  let calls = 0;
  const failure = new Error("temporary public read failure");
  const cache = createPageDataCache(() => now);
  const module = {
    cache: { maxAgeMs: 10, staleWhileRevalidateMs: 20 },
    load: () => {
      if (++calls === 1) return "old article";
      throw failure;
    }
  };
  assert.equal(await cache.load(module, createContext()), "old article");
  now = 20;
  assert.equal(await cache.load(module, createContext()), "old article");
  await new Promise(resolve => setTimeout(resolve, 0));
  now = 31;
  await assert.rejects(cache.load(module, createContext()), error => error === failure);
  assert.equal(calls, 3);
});

test("failed cached cold loads release coordination so the next read can recover", async () => {
  let calls = 0;
  const failure = new Error("read failed");
  const cache = createPageDataCache();
  const module = {
    cache: { maxAgeMs: 500 },
    load: () => { if (++calls === 1) throw failure; return "recovered"; }
  };
  await assert.rejects(cache.load(module, createContext()), error => error === failure);
  assert.equal(await cache.load(module, createContext()), "recovered");
  assert.equal(calls, 2);
});

test("page invalidation fences late reads and preserves unrelated page entries", async () => {
  const old = deferred();
  let calls = 0;
  const cache = createPageDataCache();
  const module = {
    cache: { maxAgeMs: 500 },
    load: () => ++calls === 1 ? old.promise : "new article"
  };
  const context = createContext();
  const unrelated = { ...context, page: "home", route: { ...context.route, path: "/" } };
  let unrelatedCalls = 0;
  const home = { cache: { maxAgeMs: 500 }, load: () => ++unrelatedCalls };
  await cache.load(home, unrelated);
  const pending = cache.load(module, context);
  cache.clear(context.page);
  assert.equal(await cache.load(module, context), "new article");
  old.resolve("old article");
  assert.equal(await pending, "old article");
  assert.equal(await cache.load(module, context), "new article");
  assert.equal(await cache.load(home, unrelated), 1);
  assert.equal(unrelatedCalls, 1);
});

test("full page invalidation removes every query variant and pending identity", async () => {
  let calls = 0;
  const old = deferred();
  const cache = createPageDataCache();
  const module = {
    cache: { maxAgeMs: 500 },
    load: () => ++calls === 2 ? old.promise : calls
  };
  const context = createContext();
  assert.equal(await cache.load(module, context), 1);
  const pending = cache.load(module, { ...context, query: { filter: "popular" } });
  cache.clear();
  assert.equal(await cache.load(module, context), 3);
  assert.equal(await cache.load(module, { ...context, query: { filter: "popular" } }), 4);
  old.resolve(2);
  assert.equal(await pending, 2);
  assert.equal(await cache.load(module, { ...context, query: { filter: "popular" } }), 4);
});

test("page cache retains at most 100 LRU route variants", async () => {
  let calls = 0;
  const cache = createPageDataCache();
  const module = { cache: { maxAgeMs: 60_000 }, load: () => ++calls };
  const context = index => ({ ...createContext(), query: { page: String(index) } });
  for (let index = 0; index < 100; index++) await cache.load(module, context(index));
  assert.equal(await cache.load(module, context(0)), 1);
  await cache.load(module, context(100));
  assert.equal(await cache.load(module, context(0)), 1);
  assert.equal(await cache.load(module, context(1)), 102);
  assert.equal(calls, 102);
});

test("expired page entries are pruned instead of consuming retention capacity", async () => {
  let now = 0;
  let calls = 0;
  const cache = createPageDataCache(() => now);
  const module = { cache: { maxAgeMs: 10, staleWhileRevalidateMs: 10 }, load: () => ++calls };
  const context = index => ({ ...createContext(), query: { page: String(index) } });
  for (let index = 0; index < 100; index++) await cache.load(module, context(index));
  now = 21;
  assert.equal(await cache.load(module, context(100)), 101);
  assert.equal(await cache.load(module, context(0)), 102);
});

test("page cache rejects explicit non-finite stale windows", async () => {
  const cache = createPageDataCache();
  for (const value of [NaN, Infinity, -Infinity]) {
    await assert.rejects(cache.load({
      cache: { maxAgeMs: 10, staleWhileRevalidateMs: value }, load: () => null
    }, createContext()), /non-negative staleWhileRevalidateMs/);
  }
});

test("saturated page read tracking bypasses caching instead of losing work", async () => {
  let calls = 0;
  const read = deferred();
  const cache = createPageDataCache();
  const module = { cache: { maxAgeMs: 500 }, load: () => { calls++; return read.promise; } };
  const context = index => ({ ...createContext(), query: { page: String(index) } });
  const tracked = Array.from({ length: 100 }, (_, index) => cache.load(module, context(index)));
  const shared = cache.load(module, context(0));
  const bypassed = [cache.load(module, context(100)), cache.load(module, context(100))];
  await Promise.resolve();
  assert.equal(calls, 102);
  read.resolve("loaded");
  assert.equal((await Promise.all([...tracked, shared, ...bypassed])).length, 103);
  await cache.load(module, context(100));
  assert.equal(calls, 103);
});

test("cached page subscribers cancel independently, with the last abort fencing the read", async () => {
  const cache = createPageDataCache();
  const read = deferred();
  let transport;
  let calls = 0;
  const module = { cache: { maxAgeMs: 500 }, load({ signal }) {
    transport = signal; calls++; return calls === 1 ? read.promise : "fresh";
  } };
  const first = new AbortController();
  const second = new AbortController();
  const a = cache.load(module, { ...createContext(), signal: first.signal });
  const b = cache.load(module, { ...createContext(), signal: second.signal });
  await Promise.resolve();
  first.abort();
  await assert.rejects(a, { name: "AbortError" });
  assert.equal(transport.aborted, false);
  assert.equal(calls, 1);
  second.abort();
  await assert.rejects(b, { name: "AbortError" });
  assert.equal(transport.aborted, true);
  assert.equal(await cache.load(module, createContext()), "fresh");
  read.resolve("obsolete");
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(await cache.load(module, createContext()), "fresh");
  assert.equal(calls, 2);
});

test("one cached subscriber's abort cannot discard another subscriber's result", async () => {
  const cache = createPageDataCache();
  const read = deferred();
  const controller = new AbortController();
  let transport;
  const module = { cache: { maxAgeMs: 500 }, load({ signal }) { transport = signal; return read.promise; } };
  const departed = cache.load(module, { ...createContext(), signal: controller.signal });
  const remaining = cache.load(module, createContext());
  await Promise.resolve();
  controller.abort();
  await assert.rejects(departed, { name: "AbortError" });
  assert.equal(transport.aborted, false);
  read.resolve("shared");
  assert.equal(await remaining, "shared");
  assert.equal(await cache.load(module, createContext()), "shared");
});

test("a pre-aborted page load starts neither a module import nor application loader", async () => {
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(loadClientPageData(async () => { calls++; return { load: () => ++calls }; }, {
    ...createContext(), signal: controller.signal
  }), { name: "AbortError" });
  await assert.rejects(createPageDataCache().load({ load: () => ++calls }, {
    ...createContext(), signal: controller.signal
  }), { name: "AbortError" });
  assert.equal(calls, 0);
});

test("SWR survives page departure but app disposal cancels the tracked background read", async () => {
  let now = 0;
  let calls = 0;
  let transport;
  const read = deferred();
  const cache = createPageDataCache(() => now);
  const module = { cache: { maxAgeMs: 10, staleWhileRevalidateMs: 20 }, load({ signal }) {
    transport = signal; return ++calls === 1 ? "original" : read.promise;
  } };
  assert.equal(await cache.load(module, createContext()), "original");
  now = 20;
  const page = new AbortController();
  assert.equal(await cache.load(module, { ...createContext(), signal: page.signal }), "original");
  page.abort();
  assert.equal(transport.aborted, false);
  cache.dispose();
  assert.equal(transport.aborted, true);
  read.resolve("late background");
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(await cache.load({ ...module, load: () => "remounted" }, createContext()), "remounted");
});

test("uncached page loaders receive the caller signal and release ignored-abort waits", async () => {
  const controller = new AbortController();
  const read = deferred();
  let signal;
  const result = createPageDataCache().load({ load(context) { signal = context.signal; return read.promise; } }, {
    ...createContext(), signal: controller.signal
  });
  assert.equal(signal, controller.signal);
  controller.abort();
  await assert.rejects(result, { name: "AbortError" });
  read.resolve("ignored abort");
});

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function createContext() {
  const route = createRoute();
  return { page: route.page, route, params: route.params, query: route.query, meta: {} };
}

function createRoute() {
  return {
    hash: "",
    matched: true,
    meta: {},
    page: "blog/[slug]",
    params: {
      slug: "html-first"
    },
    path: "/blog/html-first",
    pattern: "/blog/:slug",
    query: {
      filter: "recent"
    }
  };
}
