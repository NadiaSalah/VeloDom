/**
 * ----------------------------------------
 * Module: Store Mutation and Read Freshness Tests
 * ----------------------------------------
 *
 * Executes the real consumer scripts/templates and HTTP fixture against the
 * public app controls. Accepted writes and subsequent read failures remain
 * distinct; private reads and auth changes never reuse another session's data.
 * ----------------------------------------
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createApp, createServerSessionAuthProvider } from "../../../packages/velodom/src/index.ts";
import { compileTemplate } from "../../../packages/velodom/src/compiler/index.ts";
import { createStoreBackendFixture } from "../../../examples/velodom-store/server/backend-fixture.js";
import routes from "../../../examples/velodom-store/src/api/routes.js";
import { loginStoreSession } from "../../../examples/velodom-store/src/domain/backend/store-api-client.js";
import * as homeData from "../../../examples/velodom-store/src/pages/home/data.js";
import * as adminData from "../../../examples/velodom-store/src/pages/admin/products/data.js";
import * as adminScript from "../../../examples/velodom-store/src/pages/admin/products/script.js";
import * as sessionScript from "../../../examples/velodom-store/src/pages/sign-in/script.js";
import { installDom, waitFor } from "../../test-support/dom.js";

test("confirmed bulk writes refresh filters/totals and invalidate the warm public catalog", async t => {
  const fixture = await setup(t);
  try {
    await fixture.app.mount();
    assert.equal(fixture.publicReads(), 1);
    await fixture.app.navigate("/admin/products?q=workspace&status=active");
    const state = fixture.state("admin/products");
    assert.equal(state.adminResult.pagination.total, 2);
    await selectAndWrite(state);
    assert.equal(state.adminResult.pagination.total, 1);
    assert.equal(state.adminResult.items.length, 1);
    assert.equal(state.queryText, "Future filter draft");
    assert.equal(state.bulkError, "");
    assert.equal(state.adminError, "");
    await fixture.app.navigate("/?category=workspace");
    assert.equal(fixture.publicReads(), 2);
    assert.equal(document.querySelector("h1").textContent, "1 public products");
  } finally { await fixture.dispose(); }
});

test("accepted write plus failed refetch preserves success and last good list, then retries only the read", async t => {
  const fixture = await setup(t);
  try {
    await fixture.app.mount();
    await fixture.app.navigate("/admin/products?q=workspace&status=active");
    const state = fixture.state("admin/products");
    const previous = state.adminResult;
    fixture.failReadAfterWrite();
    await selectAndWrite(state);
    assert.match(state.bulkResult.message, /1 product archived/);
    assert.equal(state.bulkError, "");
    assert.match(state.adminError, /post-write read unavailable/);
    assert.equal(state.adminResult, previous);
    assert.equal(state.queryText, "Future filter draft");
    assert.equal(document.querySelectorAll(".admin-table tbody tr").length, 2);
    assert.equal(fixture.writeCount(), 1);
    await state.refreshList();
    assert.equal(state.adminError, "");
    assert.equal(state.adminResult.pagination.total, 1);
    assert.equal(fixture.writeCount(), 1);
  } finally { await fixture.dispose(); }
});

test("a rejected bulk write retains selection and performs no refresh/invalidation", async t => {
  t.mock.method(console, "error", () => {});
  const fixture = await setup(t);
  try {
    await fixture.app.mount();
    await fixture.app.navigate("/admin/products?q=workspace&status=active");
    const state = fixture.state("admin/products");
    const previous = state.adminResult;
    const reads = fixture.privateListReads();
    await loginStoreSession({ account: "editor-north" });
    state.toggleProductSelection(state.adminResult.items[0].id, true);
    document.querySelector('#bulk-confirm-dialog button[data-vd-request]').click();
    await waitFor(() => assert.notEqual(state.bulkError, ""));
    assert.equal(state.adminResult, previous);
    assert.equal(state.selectedIds.length, 1);
    assert.equal(fixture.privateListReads(), reads);
    assert.equal(fixture.writeCount(), 0);
    await fixture.app.navigate("/?category=workspace");
    assert.equal(fixture.publicReads(), 1);
  } finally { await fixture.dispose(); }
});

test("real account replacement/logout callbacks invalidate reads and session data stays uncached", async t => {
  const fixture = await setup(t);
  try {
    await fixture.app.mount();
    await fixture.app.navigate("/sign-in");
    document.querySelectorAll(".account-card")[2].click();
    await waitFor(() => assert.equal(fixture.state("sign-in").session?.user?.name, "Casey Customer"));
    await fixture.app.navigate("/?category=workspace");
    assert.equal(fixture.publicReads(), 2);
    await fixture.app.navigate("/sign-in");
    const state = fixture.state("sign-in");
    assert.equal(state.session.user.name, "Casey Customer");
    document.querySelector('[data-vd-request="session.logout"]').click();
    await waitFor(() => assert.equal(state.session?.authenticated, false));
    await fixture.app.navigate("/?category=workspace");
    assert.equal(fixture.publicReads(), 3);
    await fixture.app.navigate("/sign-in");
    assert.equal(fixture.state("sign-in").session.authenticated, false);
  } finally { await fixture.dispose(); }
});

async function selectAndWrite(state) {
  state.queryText = "Future filter draft";
  state.toggleProductSelection(state.adminResult.items[0].id, true);
  document.querySelector('#bulk-confirm-dialog button[data-vd-request]').click();
  await waitFor(() => {
    assert.ok(state.bulkResult?.message);
    assert.equal(state.bulkLoading, false);
    assert.equal(state.adminLoading, false);
  });
}

async function setup(t) {
  const removeDom = installDom();
  document.body.innerHTML = '<div id="app"></div>';
  history.replaceState({}, "", "/?category=workspace");
  const previousFrame = Object.getOwnPropertyDescriptor(globalThis, "requestAnimationFrame");
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true, writable: true, value: callback => { callback(); return 1; }
  });
  t.after(() => {
    if (previousFrame) Object.defineProperty(globalThis, "requestAnimationFrame", previousFrame);
    else delete globalThis.requestAnimationFrame;
    removeDom();
  });
  const backend = createStoreBackendFixture();
  let cookie = "";
  let failAfterWrite = false;
  let failRead = false;
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options = {}) => {
    const headers = new Headers(options.headers);
    if (cookie) headers.set("cookie", cookie);
    const request = new Request(new URL(url, "http://store.test"), { ...options, headers });
    const path = new URL(request.url).pathname;
    requests.push({ path, method: request.method });
    if (failRead && path === "/__fixture-api/admin/products" && request.method === "GET") {
      failRead = false;
      return new Response(JSON.stringify({ message: "post-write read unavailable" }), {
        status: 500, headers: { "content-type": "application/json" }
      });
    }
    const response = await backend.handle(request);
    if (response.headers.has("set-cookie")) cookie = response.headers.get("set-cookie").split(";")[0];
    if (failAfterWrite && response.ok && path.endsWith("/bulk")) { failRead = true; failAfterWrite = false; }
    return response;
  });
  await loginStoreSession({ account: "admin-north" });
  const states = new Map();
  const html = async name => compileTemplate(await readFile(new URL(`../../../examples/velodom-store/src/pages/${name}/index.html`, import.meta.url), "utf8")).html;
  const wrap = (name, module) => async () => ({
    ...module,
    init({ state, data, ctx }) {
      states.set(name, state);
      return module.init({ state, data, ctx });
    }
  });
  const app = createApp({
    routes,
    auth: { defaultProvider: "fixture", providers: { fixture: createServerSessionAuthProvider({ sessionUrl: "/__fixture-api/session" }) } },
    adapter: { pages: {
      html: {
        home: async () => '<h1 data-vd-text="data.items.length + \' public products\'"></h1>',
        "products/[id]": async () => "<h1>Product</h1>",
        "admin/products": () => html("admin/products"),
        "sign-in": () => html("sign-in")
      },
      data: { home: async () => homeData, "admin/products": async () => adminData },
      modules: { "admin/products": wrap("admin/products", adminScript), "sign-in": wrap("sign-in", sessionScript) }
    } }
  });
  return {
    app,
    state: name => states.get(name),
    failReadAfterWrite() { failAfterWrite = true; },
    publicReads: () => requests.filter(request => request.path === "/__fixture-api/catalog").length,
    privateListReads: () => requests.filter(request => request.path === "/__fixture-api/admin/products" && request.method === "GET").length,
    writeCount: () => requests.filter(request => request.path.endsWith("/bulk")).length,
    async dispose() { await app.destroy(); }
  };
}
