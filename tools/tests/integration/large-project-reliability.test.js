/**
 * ----------------------------------------
 * Module: Larger Project Navigation Regression
 * ----------------------------------------
 *
 * Exercises a deterministic route/component graph through many mounts. This
 * is browser-runtime correctness evidence, not a throughput benchmark.
 * ----------------------------------------
 */

import assert from "node:assert/strict";
import test from "node:test";
import { createPageRouter } from "../../../packages/velodom/src/page-router.ts";
import { installDom } from "../../test-support/dom.js";

test("larger route graph releases page owners across deep links, guards and repeated mounts", async () => {
  const removeDom = installDom();
  document.body.innerHTML = '<main id="app"></main>';
  history.replaceState({}, "", "/");
  let activeOwners = 0;
  let mountedOwners = 0;
  let releasedOwners = 0;
  let eventCalls = 0;
  let staleButton;
  let authenticated = false;
  const pages = Object.fromEntries(Array.from({ length: 80 }, (_, index) => {
    const page = `catalog/department-${Math.floor(index / 10)}/page-${index}`;
    return [page, async () => `<h1>Page ${index}</h1><button data-vd-on-click="touch()">Touch</button><vd-component name="shared/card-${index % 32}"></vd-component>`];
  }));
  const modules = Object.fromEntries(Object.keys(pages).map(page => [page, async () => ({
    init({ ctx, state }) {
      activeOwners += 1;
      mountedOwners += 1;
      state.touch = () => { eventCalls += 1; };
      ctx.onCleanup(() => {
        activeOwners -= 1;
        releasedOwners += 1;
      });
    }
  })]));
  const components = Object.fromEntries(Array.from({ length: 32 }, (_, index) => [
    `shared/card-${index}`, async () => `<p>Card ${index}</p>`
  ]));
  const router = createPageRouter({
    pages: { html: { home: async () => "<h1>Home</h1>", ...pages }, modules },
    components: { html: components }
  }, {
    beforeEach({ to }) {
      return !to.path.endsWith("/page-79") || authenticated;
    }
  });

  try {
    await router.init();
    for (let visit = 0; visit < 160; visit += 1) {
      const index = visit % 79;
      const route = `/catalog/department-${Math.floor(index / 10)}/page-${index}`;
      assert.equal(await router.navigate(`${route}?visit=${visit}`), true);
      assert.equal(location.pathname, route);
      assert.equal(document.querySelector("h1")?.textContent, `Page ${index}`);
      assert.equal(document.querySelector("p")?.textContent, `Card ${index % 32}`);
      const currentButton = document.querySelector("button");
      const before = eventCalls;
      staleButton?.dispatchEvent(new Event("click"));
      assert.equal(eventCalls, before, "detached listeners must be removed");
      currentButton.dispatchEvent(new Event("click"));
      assert.equal(eventCalls, before + 1);
      staleButton = currentButton;
      assert.equal(activeOwners, 1);
      assert.equal(mountedOwners - releasedOwners, 1);
    }

    const protectedRoute = "/catalog/department-7/page-79";
    assert.equal(await router.navigate(protectedRoute), false);
    assert.equal(activeOwners, 1);
    authenticated = true;
    assert.equal(await router.navigate(`${protectedRoute}?view=details`), true);
    assert.equal(location.search, "?view=details");
    assert.equal(document.querySelector("h1")?.textContent, "Page 79");
    assert.equal(activeOwners, 1);
    authenticated = false;
    assert.equal(await router.navigate("/catalog/department-0/page-0"), true);
    assert.equal(await router.navigate(protectedRoute), false);
    assert.equal(document.querySelector("h1")?.textContent, "Page 0");
    assert.equal(activeOwners, 1);
  } finally {
    await router.destroy();
    assert.equal(activeOwners, 0);
    assert.equal(mountedOwners, releasedOwners);
    removeDom();
  }
});
