/** Exercises explicit page-read ownership, freshness, drafts and cancellation. */
import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../../../packages/velodom/src/index.ts";
import { installDom } from "../../test-support/dom.js";

const removeDom = installDom();
test.after(removeDom);
test.beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  history.replaceState({}, "", "/");
});

test("public page invalidation is explicit, targeted and never fetches or remounts", async () => {
  let calls = 0;
  const app = createApp({ adapter: resources(() => ({ title: `Read ${++calls}` })) });
  try {
    await app.mount();
    const heading = document.querySelector("h1");
    app.invalidatePageData("home");
    assert.equal(calls, 1);
    assert.equal(document.querySelector("h1"), heading);
    assert.equal(heading.textContent, "Read 1");
    await app.navigate("/");
    assert.equal(calls, 2);
    assert.equal(document.querySelector("h1").textContent, "Read 2");
  } finally { await app.destroy(); }
});

test("refetch updates state.data without recreating the page, draft or mounted hooks", async () => {
  let calls = 0;
  let initCalls = 0;
  let mountedCalls = 0;
  let ctx;
  const adapter = resources(() => ({ title: `Read ${++calls}` }));
  adapter.pages.modules = { home: async () => ({
    init({ ctx: context }) { ctx = context; initCalls++; return { draft: "Untouched" }; },
    mounted() { mountedCalls++; }
  }) };
  const app = createApp({ adapter });
  try {
    await app.mount();
    const heading = document.querySelector("h1");
    const input = document.querySelector("input");
    input.value = "User draft";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    assert.deepEqual(await ctx.refetchPageData(), { title: "Read 2" });
    assert.equal(heading.textContent, "Read 2");
    assert.equal(document.querySelector("h1"), heading);
    assert.equal(document.querySelector("input"), input);
    assert.equal(input.value, "User draft");
    assert.equal(initCalls, 1);
    assert.equal(mountedCalls, 1);
    assert.equal(location.pathname, "/");
  } finally { await app.destroy(); }
});

test("concurrent fresh reads coalesce even when the page has no cache policy", async () => {
  let calls = 0;
  const read = deferred();
  const started = deferred();
  const load = () => ++calls === 1 ? { title: "Original" } : (started.resolve(), read.promise);
  const adapter = resources(load);
  adapter.pages.data.home = async () => ({ load });
  const app = createApp({ adapter });
  try {
    await app.mount();
    const first = app.refetchPageData();
    const second = app.refetchPageData();
    await started.promise;
    assert.equal(calls, 2);
    read.resolve({ title: "Fresh" });
    assert.deepEqual(await first, { title: "Fresh" });
    assert.deepEqual(await second, { title: "Fresh" });
    assert.equal(document.querySelector("h1").textContent, "Fresh");
  } finally { await app.destroy(); }
});

test("failed refetch preserves mounted data and drafts and permits an explicit retry", async () => {
  let calls = 0;
  const app = createApp({ adapter: resources(() => {
    if (++calls === 2) throw new Error("read unavailable");
    return { title: `Read ${calls}` };
  }) });
  try {
    await app.mount();
    const input = document.querySelector("input");
    input.value = "Keep the user's draft";
    await assert.rejects(app.refetchPageData(), /read unavailable/);
    assert.equal(document.querySelector("h1").textContent, "Read 1");
    assert.equal(document.querySelector("input"), input);
    assert.equal(input.value, "Keep the user's draft");
    await app.refetchPageData();
    assert.equal(document.querySelector("h1").textContent, "Read 3");
  } finally { await app.destroy(); }
});

test("invalidation cancels a pending refresh and fences its late ignored-abort value", async () => {
  let calls = 0;
  let transport;
  const read = deferred();
  const started = deferred();
  const app = createApp({ adapter: resources(({ signal }) => {
    if (++calls === 2) { transport = signal; started.resolve(); return read.promise; }
    return { title: `Read ${calls}` };
  }) });
  try {
    await app.mount();
    const obsolete = app.refetchPageData();
    await started.promise;
    app.invalidatePageData("home");
    await assert.rejects(obsolete, { name: "AbortError" });
    assert.equal(transport.aborted, true);
    await app.refetchPageData();
    read.resolve({ title: "Obsolete" });
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(document.querySelector("h1").textContent, "Read 3");
    await app.navigate("/");
    assert.equal(calls, 3);
  } finally { await app.destroy(); }
});

test("page departure aborts refetch and cannot change the next page's data", async () => {
  let calls = 0;
  let ctx;
  const read = deferred();
  const started = deferred();
  const adapter = resources(() => ++calls === 1 ? { title: "Original" } : (started.resolve(), read.promise));
  adapter.pages.modules.home = async () => ({ init({ ctx: context }) { ctx = context; } });
  adapter.pages.html.other = async () => "<h1>Other page</h1>";
  const app = createApp({ adapter });
  try {
    await app.mount();
    const pending = ctx.refetchPageData();
    await started.promise;
    const cancelled = assert.rejects(pending, { name: "AbortError" });
    await app.navigate("/other");
    await cancelled;
    read.resolve({ title: "Obsolete" });
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(document.querySelector("h1").textContent, "Other page");
    await assert.rejects(ctx.refetchPageData(), { name: "AbortError" });
    assert.equal(calls, 2);
  } finally { await app.destroy(); }
});

test("initial navigation invalidated during a read reloads before committing stale data", async () => {
  let calls = 0;
  const read = deferred();
  const started = deferred();
  const adapter = resources(() => ({ title: "Home" }));
  adapter.pages.html.other = async () => '<h1 data-vd-text="data.title"></h1>';
  adapter.pages.data.other = async () => ({ cache: { maxAgeMs: 60_000 }, load() {
    if (++calls === 1) { started.resolve(); return read.promise; }
    return { title: "After mutation" };
  } });
  const app = createApp({ adapter });
  try {
    await app.mount();
    const pending = app.navigate("/other");
    await started.promise;
    app.invalidatePageData("other");
    read.resolve({ title: "Before mutation" });
    assert.equal(await pending, true);
    assert.equal(document.querySelector("h1").textContent, "After mutation");
    assert.equal(location.pathname, "/other");
    assert.equal(calls, 2);
  } finally { await app.destroy(); }
});

test("targeted invalidation retains other pages and clear-all releases every variant", async () => {
  let home = 0;
  let other = 0;
  const adapter = resources(() => ({ title: `Home ${++home}` }));
  adapter.pages.html.other = async () => '<h1 data-vd-text="data.title"></h1>';
  adapter.pages.data.other = async () => ({ cache: { maxAgeMs: 60_000 }, load: () => ({ title: `Other ${++other}` }) });
  const app = createApp({ adapter });
  try {
    await app.mount();
    await app.navigate("/other");
    app.invalidatePageData("home");
    await app.navigate("/other");
    assert.equal(other, 1);
    await app.navigate("/");
    assert.equal(home, 2);
    app.invalidatePageData();
    await app.navigate("/other");
    await app.navigate("/");
    assert.equal(other, 2);
    assert.equal(home, 3);
  } finally { await app.destroy(); }
});

test("invalid page names cannot silently clear data, and refresh requires a mounted page", async () => {
  let calls = 0;
  const app = createApp({ adapter: resources(() => ({ title: `Read ${++calls}` })) });
  await assert.rejects(app.refetchPageData(), /mounted page/);
  app.invalidatePageData();
  try {
    await app.mount();
    for (const page of ["/", "/home", "missing", "home.vd", "", null, 1]) {
      assert.throws(() => app.invalidatePageData(page), /logical page name/);
    }
    await app.navigate("/");
    assert.equal(calls, 1);
  } finally { await app.destroy(); }
  await assert.rejects(app.refetchPageData(), /mounted page/);
});

test("a component can explicitly refresh its page, and a page without a loader is a no-op", async () => {
  let ctx;
  let calls = 0;
  const adapter = resources(() => ({ title: `Read ${++calls}` }));
  adapter.pages.html.home = async () => '<h1 data-vd-text="data.title"></h1><div data-vd-component="refresh-button"></div>';
  adapter.components = {
    html: { "refresh-button": async () => "<button type='button'>Refresh</button>" },
    modules: { "refresh-button": async () => ({ init({ ctx: context }) { ctx = context; } }) }
  };
  adapter.pages.html.other = async () => "<h1>No loader</h1>";
  const app = createApp({ adapter });
  try {
    await app.mount();
    const button = document.querySelector("button");
    ctx.invalidatePageData("home");
    await ctx.refetchPageData();
    assert.equal(document.querySelector("button"), button);
    assert.equal(document.querySelector("h1").textContent, "Read 2");
    await app.navigate("/other");
    assert.equal(await app.refetchPageData(), undefined);
    assert.equal(document.querySelector("h1").textContent, "No loader");
  } finally { await app.destroy(); }
});

test("app destruction aborts pending refetch and ignores a late transport completion", async () => {
  let calls = 0;
  let transport;
  const read = deferred();
  const started = deferred();
  const app = createApp({ adapter: resources(({ signal }) => {
    if (++calls === 2) { transport = signal; started.resolve(); return read.promise; }
    return { title: "Original" };
  }) });
  try {
    await app.mount();
    const refresh = app.refetchPageData();
    const rejection = assert.rejects(refresh, { name: "AbortError" });
    await started.promise;
    await app.destroy();
    await rejection;
    assert.equal(transport.aborted, true);
    const afterDestroy = document.body.innerHTML;
    read.resolve({ title: "Obsolete" });
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(document.body.innerHTML, afterDestroy);
    await assert.rejects(app.refetchPageData(), /mounted page/);
  } finally { await app.destroy(); }
});

function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function resources(load) {
  return { pages: {
    html: { home: async () => '<h1 data-vd-text="data.title"></h1><input data-vd-model="draft" aria-label="Draft">' },
    modules: { home: async () => ({ state: { draft: "" } }) },
    data: { home: async () => ({ cache: { maxAgeMs: 60_000 }, load }) }
  } };
}
