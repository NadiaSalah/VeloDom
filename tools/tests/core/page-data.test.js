import assert from "node:assert/strict";
import test from "node:test";
import {
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
