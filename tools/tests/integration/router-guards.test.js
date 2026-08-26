import assert from "node:assert/strict";
import test from "node:test";
import { createPageRouter } from "../../../packages/velodom/src/page-router.ts";
import {
  installDom,
  waitFor
} from "../../test-support/dom.js";

const removeDom = installDom();

test.after(() => {
  removeDom();
});

test.beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main>';
  history.replaceState({}, "", "/");
});

test("global guards run before a matched page guard", async () => {
  const calls = [];
  const router = createPageRouter(createAdapter({
    account: {
      beforeEnter({ to, from }) {
        calls.push(["page", to.path, from?.path]);
        return true;
      }
    }
  }), {
    beforeEach: [
      ({ to, from }) => {
        calls.push(["global:one", to.path, from?.path]);
        return true;
      },
      async ({ to, from }) => {
        await Promise.resolve();
        calls.push(["global:two", to.path, from?.path]);
      }
    ]
  });

  await router.init();
  calls.length = 0;
  await router.navigate("/account");

  assert.deepEqual(calls, [
    ["global:one", "/account", "/"],
    ["global:two", "/account", "/"],
    ["page", "/account", "/"]
  ]);
  assert.equal(document.querySelector("h1")?.textContent, "Account");

  await router.destroy();
});

test("a stale asynchronous guard cannot replace a newer navigation", async () => {
  let releaseSlowGuard;
  const router = createPageRouter(createAdapter(), {
    beforeEach({ to }) {
      if (to.path !== "/slow") return true;

      return new Promise(resolve => {
        releaseSlowGuard = resolve;
      });
    }
  });

  await router.init();
  const slowNavigation = router.navigate("/slow");

  await waitFor(() => {
    assert.equal(typeof releaseSlowGuard, "function");
  });
  await router.navigate("/fast");
  releaseSlowGuard(true);

  assert.equal(await slowNavigation, false);
  assert.equal(location.pathname, "/fast");
  assert.equal(document.querySelector("h1")?.textContent, "Fast");

  await router.destroy();
});

test("a blocked popstate restores the active route URL", async () => {
  const router = createPageRouter(createAdapter(), {
    beforeEach({ to, from }) {
      if (from?.path === "/account" && to.path === "/") {
        return false;
      }

      return true;
    }
  });

  await router.init();
  await router.navigate("/account");
  history.pushState({}, "", "/");
  window.dispatchEvent(new Event("popstate"));

  await waitFor(() => {
    assert.equal(location.pathname, "/account");
  });
  assert.equal(document.querySelector("h1")?.textContent, "Account");

  await router.destroy();
});

test("router options reject non-function global guards", () => {
  assert.throws(
    () => createPageRouter(createAdapter(), {
      beforeEach: [
        () => true,
        "require-session"
      ]
    }),
    /router.beforeEach must contain only functions/
  );
});

function createAdapter(configs = {}) {
  return {
    pages: {
      html: {
        home: async () => "<h1>Home</h1>",
        account: async () => "<h1>Account</h1>",
        slow: async () => "<h1>Slow</h1>",
        fast: async () => "<h1>Fast</h1>"
      },
      configs,
      modules: {},
      styles: {}
    }
  };
}
