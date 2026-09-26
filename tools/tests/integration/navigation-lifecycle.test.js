import assert from "node:assert/strict";
import test from "node:test";
import { createPageRouter } from "../../../packages/velodom/src/page-router.ts";
import { VD_INTERNAL } from "../../../packages/velodom/src/constants.ts";
import { installDom } from "../../test-support/dom.js";

const removeDom = installDom();
test.after(removeDom);
test.beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
  history.replaceState({}, "", "/");
});

test("a cancelled page read cannot bind data into a newer page", async () => {
  const read = deferred();
  const started = deferred();
  let signal;
  const router = createPageRouter(adapter({
    data: { slow: async () => ({ load(context) {
      signal = context.signal;
      started.resolve();
      return read.promise;
    } }) }
  }));
  await router.init();
  const pending = router.navigate("/slow");
  await started.promise;
  await router.navigate("/fast");
  read.resolve({ title: "Obsolete page" });
  assert.equal(await pending, false);
  assert.equal(signal?.aborted, true);
  assert.equal(document.querySelector("h1")?.textContent, "Fast page");
  assert.equal(location.pathname, "/fast");
  await router.destroy();
});

test("a delayed page template cannot replace the newest page", async () => {
  const html = deferred();
  const started = deferred();
  const router = createPageRouter(adapter({ html: { slow: () => {
    started.resolve(); return html.promise;
  } } }));
  await router.init();
  const pending = router.navigate("/slow");
  await started.promise;
  await router.navigate("/fast");
  html.resolve("<h1>Obsolete template</h1>");
  assert.equal(await pending, false);
  assert.equal(document.querySelector("h1")?.textContent, "Fast page");
  await router.destroy();
});

test("a delayed page stylesheet cannot prepend old CSS into the newest page", async () => {
  const css = deferred();
  const started = deferred();
  const router = createPageRouter(adapter({ styles: { "slow/style.css": () => {
    started.resolve(); return css.promise;
  } } }));
  await router.init();
  const pending = router.navigate("/slow");
  await started.promise;
  await router.navigate("/fast");
  css.resolve("h1 { color: magenta; }");
  assert.equal(await pending, false);
  assert.equal(document.querySelector("h1")?.textContent, "Fast page");
  assert.equal(document.querySelector("#app style"), null);
  await router.destroy();
});

test("a blocked new guard does not cancel an already accepted loading page", async () => {
  const read = deferred();
  const started = deferred();
  let signal;
  const router = createPageRouter(adapter({
    data: { slow: async () => ({ load(context) {
      signal = context.signal; started.resolve(); return read.promise;
    } }) }
  }), { beforeEach: ({ to }) => to.path !== "/blocked" });
  await router.init();
  const pending = router.navigate("/slow");
  await started.promise;
  assert.equal(await router.navigate("/blocked"), false);
  assert.equal(signal?.aborted, false);
  read.resolve({ title: "Accepted slow page" });
  assert.equal(await pending, true);
  assert.equal(document.querySelector("h1")?.textContent, "Accepted slow page");
  assert.equal(location.pathname, "/slow");
  await router.destroy();
});

test("destroy cancels a pending page read without post-destroy DOM commits", async () => {
  const read = deferred();
  const started = deferred();
  let signal;
  const router = createPageRouter(adapter({ data: { slow: async () => ({ load(context) {
    signal = context.signal; started.resolve(); return read.promise;
  } }) } }));
  await router.init();
  const pending = router.navigate("/slow");
  await started.promise;
  await router.destroy();
  document.querySelector("#app").innerHTML = "Destroyed app";
  read.resolve({ title: "Obsolete page" });
  assert.equal(await pending, false);
  assert.equal(signal?.aborted, true);
  assert.equal(document.querySelector("#app")?.textContent, "Destroyed app");
});

test("cancelled page init releases cleanup and never merges its late result", async () => {
  const init = deferred();
  const started = deferred();
  let signal;
  let cleaned = 0;
  let mounted = 0;
  const router = createPageRouter(adapter({ modules: { slow: async () => ({
    init({ ctx }) {
      signal = ctx.signal;
      ctx.onCleanup(() => { cleaned++; });
      started.resolve();
      return init.promise;
    },
    mounted() { mounted++; }
  }) } }));
  await router.init();
  const pending = router.navigate("/slow");
  await started.promise;
  await router.navigate("/fast");
  init.resolve({ title: "Obsolete init" });
  assert.equal(await pending, false);
  assert.equal(signal.aborted, true);
  assert.equal(cleaned, 1);
  assert.equal(mounted, 0);
  assert.equal(document.querySelector("h1")?.textContent, "Fast page");
  await router.destroy();
});

test("cancelled navigation settles before an ignored-signal loader finishes", async () => {
  const read = deferred();
  const started = deferred();
  const router = createPageRouter(adapter({ data: { slow: async () => ({ load() {
    started.resolve(); return read.promise;
  } }) } }));
  await router.init();
  const pending = router.navigate("/slow");
  await started.promise;
  await router.navigate("/fast");
  const result = await Promise.race([pending, new Promise(resolve => setTimeout(() => resolve("hung"), 200))]);
  assert.equal(result, false);
  read.reject(new Error("late failure must be observed"));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(document.querySelector("h1")?.textContent, "Fast page");
  await router.destroy();
});

test("same-page hash navigation keeps the mounted scope while cancelling replacement", async () => {
  const read = deferred();
  const started = deferred();
  let homeSignal;
  const router = createPageRouter(adapter({
    modules: { home: async () => ({ init({ ctx }) { homeSignal = ctx.signal; } }) },
    data: { slow: async () => ({ load() { started.resolve(); return read.promise; } }) }
  }));
  await router.init();
  const pending = router.navigate("/slow");
  await started.promise;
  await router.navigate("/#section");
  read.resolve({ title: "Obsolete page" });
  assert.equal(await pending, false);
  assert.equal(homeSignal.aborted, false);
  assert.equal(location.hash, "#section");
  assert.equal(document.querySelector("h1")?.textContent, "Home");
  await router.destroy();
  assert.equal(homeSignal.aborted, true);
});

test("late same-page init results cannot replace a newer query activation", async () => {
  const init = deferred();
  const started = deferred();
  const router = createPageRouter(adapter({
    html: { slow: async () => '<h1 data-vd-text="title"></h1>' },
    modules: { slow: async () => ({
      init({ ctx }) {
        if (ctx.query.version === "old") { started.resolve(); return init.promise; }
        return { title: "New query page" };
      }
    }) }
  }));
  await router.init();
  const pending = router.navigate("/slow?version=old");
  await started.promise;
  await router.navigate("/slow?version=new");
  init.resolve({ title: "Obsolete query page" });
  assert.equal(await pending, false);
  assert.equal(document.querySelector("h1")?.textContent, "New query page");
  assert.equal(location.search, "?version=new");
  await router.destroy();
});

test("late async page mounted completion cannot replace current route ownership", async () => {
  const mounted = deferred();
  const started = deferred();
  const router = createPageRouter(adapter({ modules: { slow: async () => ({
    mounted() { started.resolve(); return mounted.promise; }
  }) } }));
  await router.init();
  const pending = router.navigate("/slow");
  await started.promise;
  await router.navigate("/fast");
  mounted.resolve();
  assert.equal(await pending, false);
  const h1 = document.querySelector("h1");
  await router.navigate("/fast#section");
  assert.equal(document.querySelector("h1"), h1);
  await router.destroy();
});

test("departed component init is cancelled without registering or mounting late state", async () => {
  const init = deferred();
  const started = deferred();
  let signal;
  let cleaned = 0;
  let mounted = 0;
  const resources = adapter({ html: { slow: async () => '<div data-vd-component="card" data-vd-ref="card"></div>' } });
  resources.components = {
    html: { card: async () => '<span data-vd-text="label"></span>' },
    modules: { card: async () => ({
      init({ ctx }) {
        signal = ctx.signal;
        ctx.onCleanup(() => { cleaned++; });
        started.resolve();
        return init.promise;
      },
      mounted() { mounted++; }
    }) }
  };
  const router = createPageRouter(resources);
  await router.init();
  const pending = router.navigate("/slow");
  await started.promise;
  await router.navigate("/fast");
  init.resolve({ label: "Obsolete component" });
  assert.equal(await pending, false);
  assert.equal(signal.aborted, true);
  assert.equal(cleaned, 1);
  assert.equal(mounted, 0);
  assert.equal(document.querySelector("h1")?.textContent, "Fast page");
  await router.destroy();
});

test("a departed async error boundary never overwrites the newer page", async t => {
  t.mock.method(console, "error", () => {});
  const fallback = deferred();
  const started = deferred();
  const router = createPageRouter(adapter({ data: { slow: async () => ({ load() {
    throw new Error("read failed");
  } }) } }), {}, () => { started.resolve(); return fallback.promise; });
  await router.init();
  const pending = router.navigate("/slow");
  await started.promise;
  await router.navigate("/fast");
  fallback.resolve("Obsolete error fallback");
  assert.equal(await pending, false);
  assert.equal(document.querySelector("h1")?.textContent, "Fast page");
  await router.destroy();
});

test("prepare failure cleans the previous visible page before rendering a fallback", async t => {
  t.mock.method(console, "error", () => {});
  let signal;
  let cleaned = 0;
  const router = createPageRouter(adapter({
    modules: { home: async () => ({ init({ ctx }) {
      signal = ctx.signal; ctx.onCleanup(() => { cleaned++; });
    } }) },
    data: { slow: async () => ({ load() { throw new Error("read failed"); } }) }
  }), {}, () => "Visible failure");
  await router.init();
  await router.navigate("/slow");
  assert.equal(signal.aborted, true);
  assert.equal(cleaned, 1);
  assert.equal(location.pathname, "/slow");
  assert.equal(document.querySelector("#app")?.textContent, "Visible failure");
  await router.destroy();
});

test("a cancelled not-found recovery settles without a late DOM commit", async () => {
  const html = deferred();
  const started = deferred();
  let calls = 0;
  const router = createPageRouter(adapter({ html: { "404": () => {
    if (++calls === 1) {
      const error = new Error("missing resource"); error.code = VD_INTERNAL.PAGE_NOT_FOUND_CODE;
      throw error;
    }
    started.resolve(); return html.promise;
  } } }));
  await router.init();
  const missing = router.navigate("/unknown");
  await started.promise;
  await router.navigate("/fast");
  assert.equal(await missing, false);
  html.resolve("Old not-found page");
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(document.querySelector("h1")?.textContent, "Fast page");
  await router.destroy();
});

test("cancelled layout preparation cannot replace a newer page", async () => {
  const html = deferred();
  const started = deferred();
  const resources = adapter({ configs: { slow: { layout: "slow-shell" } } });
  resources.layouts = { html: { "slow-shell": () => { started.resolve(); return html.promise; } } };
  const router = createPageRouter(resources);
  await router.init();
  const pending = router.navigate("/slow");
  await started.promise;
  await router.navigate("/fast");
  html.resolve("<aside>Obsolete shell</aside><vd-page></vd-page>");
  assert.equal(await pending, false);
  assert.equal(document.querySelector("h1")?.textContent, "Fast page");
  assert.equal(document.querySelector("aside"), null);
  await router.destroy();
});

test("a failed page destroy still releases lifecycle callbacks and permits recovery", async t => {
  t.mock.method(console, "error", () => {});
  let released = false;
  const router = createPageRouter(adapter({ modules: { home: async () => ({
    init({ ctx }) { ctx.onCleanup(() => { released = true; }); },
    destroy() { throw new Error("user cleanup failed"); }
  }) } }), {}, () => "Recovered cleanup failure");
  await router.init();
  await router.navigate("/slow");
  assert.equal(released, true);
  assert.equal(document.querySelector("#app")?.textContent, "Recovered cleanup failure");
  await router.destroy();
});

function adapter(overrides = {}) {
  return { pages: {
    ...overrides,
    html: {
      home: async () => "<h1>Home</h1><div id='section'></div>",
      slow: async () => '<h1 data-vd-text="data.title"></h1>',
      fast: async () => '<h1 data-vd-text="data.title"></h1>',
      blocked: async () => "<h1>Blocked</h1>",
      ...overrides.html
    },
    data: {
      slow: async () => ({ load: () => ({ title: "Slow page" }) }),
      fast: async () => ({ load: () => ({ title: "Fast page" }) }),
      ...overrides.data
    }
  } };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}
