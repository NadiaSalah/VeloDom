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
