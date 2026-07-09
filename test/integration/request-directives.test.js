import assert from "node:assert/strict";
import test from "node:test";
import { VD_REQUEST } from "../../src/core/constants.ts";
import { applyDirectives } from "../../src/core/directives.ts";
import { createPageEventHub } from "../../src/core/events.ts";
import { createState } from "../../src/core/reactive.ts";
import {
  configureRequestRuntime
} from "../../src/core/requests/request-router.ts";
import {
  installDom,
  waitFor
} from "../../test-support/dom.js";

const removeDom = installDom();

test.after(() => {
  removeDom();
});

test.beforeEach(() => {
  document.body.innerHTML = "";
  configureRequestRuntime();
});

test("request config resolves params, target, and automatic status state", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.load"
      data-vd-request-config="{
        params: { id: postId },
        target: 'postResult',
        autoState: true
      }"
    >Load</button>
  `);
  let finishRequest;
  configureRequestRuntime({
    routes: {
      "posts.load": params => new Promise(resolve => {
        finishRequest = () => resolve({
          id: params.id
        });
      })
    }
  });
  const state = createState({
    postError: "old error",
    postId: 11,
    postLoading: false,
    postResult: null
  });
  const cleanup = await applyDirectives(root, state);

  root.querySelector("button").click();
  await waitFor(() => {
    assert.equal(state.postLoading, true);
    assert.equal(state.postError, "");
    assert.equal(typeof finishRequest, "function");
  });

  finishRequest();
  await waitFor(() => {
    assert.deepEqual(state.postResult, {
      id: 11
    });
  });
  assert.equal(state.postLoading, false);

  cleanup();
});

test("request-state derives loading and error names from a result target", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.load"
      data-vd-target="articleResult"
      data-vd-request-state
    >Load</button>
  `);
  let finishRequest;
  configureRequestRuntime({
    routes: {
      "posts.load": () => new Promise(resolve => {
        finishRequest = () => resolve("loaded");
      })
    }
  });
  const state = createState({
    articleError: "old error",
    articleLoading: false,
    articleResult: null
  });
  const cleanup = await applyDirectives(root, state);

  root.querySelector("button").click();
  await waitFor(() => {
    assert.equal(state.articleLoading, true);
    assert.equal(state.articleError, "");
  });

  finishRequest();
  await waitFor(() => {
    assert.equal(state.articleResult, "loaded");
  });
  assert.equal(state.articleLoading, false);

  cleanup();
});

test("auto-state alias derives loading and error names from a result target", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.load"
      data-vd-target="articleResult"
      data-vd-auto-state
    >Load</button>
  `);

  configureRequestRuntime({
    routes: {
      "posts.load": () => "loaded"
    }
  });
  const state = createState({
    articleError: "old error",
    articleLoading: false,
    articleResult: null
  });
  const cleanup = await applyDirectives(root, state);

  root.querySelector("button").click();
  await waitFor(() => {
    assert.equal(state.articleResult, "loaded");
  });

  assert.equal(state.articleError, "");
  assert.equal(state.articleLoading, false);

  cleanup();
});

test("explicit state bindings can write to an opted-in page", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.load"
      data-vd-params="{ id: 9 }"
      data-vd-target="home"
      data-vd-state="externalResult"
      data-vd-loading="externalLoading"
      data-vd-error="externalError"
    >Load</button>
  `);
  configureRequestRuntime({
    routes: {
      "posts.load": params => ({
        id: params.id
      })
    }
  });
  const current = createState({
    __vdPageName: "features"
  });
  const home = createState({
    $allowExternalWrite: [
      "externalResult",
      "externalLoading",
      "externalError"
    ],
    __vdPageName: "home",
    externalError: "old error",
    externalLoading: false,
    externalResult: null
  });
  const cleanup = await applyDirectives(root, current, createPageOptions({
    home
  }));

  root.querySelector("button").click();
  await waitFor(() => {
    assert.deepEqual(home.externalResult, {
      id: 9
    });
  });
  assert.equal(home.externalLoading, false);
  assert.equal(home.externalError, "");

  cleanup();
});

test("external writes are blocked unless the target page opts in", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.load"
      data-vd-target="home"
      data-vd-state="externalResult"
    >Load</button>
  `);
  let handlerCalls = 0;
  configureRequestRuntime({
    routes: {
      "posts.load": () => {
        handlerCalls += 1;
        return "forbidden";
      }
    }
  });
  const events = createPageEventHub();
  const errors = [];
  events.on(VD_REQUEST.EVENTS.ERROR, event => {
    errors.push(event);
  });
  const current = createState({
    __vdPageName: "features",
    emit: events.emit
  });
  const home = createState({
    __vdPageName: "home",
    externalResult: null
  });

  await withoutConsoleError(async messages => {
    const cleanup = await applyDirectives(root, current, createPageOptions({
      home
    }));

    root.querySelector("button").click();
    await waitFor(() => {
      assert.equal(errors.length, 1);
    });

    assert.equal(handlerCalls, 0);
    assert.equal(home.externalResult, null);
    assert.equal(errors[0].stage, VD_REQUEST.STAGES.CONFIG);
    assert.equal(errors[0].code, VD_REQUEST.CODES.INVALID_CONFIG);
    assert.match(messages[0], /External Page Write Not Allowed/);

    cleanup();
  });
});

test("failed requests write error state and emit a request error event", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.fail"
      data-vd-target="result"
      data-vd-loading="loading"
      data-vd-error="error"
    >Load</button>
  `);
  configureRequestRuntime({
    routes: {
      "posts.fail": async () => {
        throw new Error("Post service unavailable");
      }
    }
  });
  const events = createPageEventHub();
  const errors = [];
  events.on(VD_REQUEST.EVENTS.ERROR, event => {
    errors.push(event);
  });
  const state = createState({
    emit: events.emit,
    error: "",
    loading: false,
    result: null
  });

  await withoutConsoleError(async messages => {
    const cleanup = await applyDirectives(root, state);

    root.querySelector("button").click();
    await waitFor(() => {
      assert.equal(state.error, "Post service unavailable");
      assert.equal(errors.length, 1);
    });

    assert.equal(state.loading, false);
    assert.equal(state.result, null);
    assert.equal(errors[0].stage, VD_REQUEST.STAGES.REQUEST);
    assert.match(errors[0].message, /Post service unavailable/);
    assert.match(messages[0], /API Request Failed/);

    cleanup();
  });
});

test("request role checks allow matching authenticated sessions", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.secure"
      data-vd-target="result"
      data-vd-loading="loading"
      data-vd-error="error"
    >Load</button>
  `);
  let handlerCalls = 0;
  configureRequestRuntime({
    auth: {
      defaultProvider: "test",
      providers: {
        test() {
          return {
            authenticated: true,
            roles: ["editor"]
          };
        }
      }
    },
    routes: {
      "posts.secure": {
        handler() {
          handlerCalls += 1;

          return {
            ok: true
          };
        },
        roles: ["editor", "admin"]
      }
    }
  });
  const state = createState({
    error: "old error",
    loading: false,
    result: null
  });
  const cleanup = await applyDirectives(root, state);

  root.querySelector("button").click();
  await waitFor(() => {
    assert.deepEqual(state.result, {
      ok: true
    });
  });

  assert.equal(handlerCalls, 1);
  assert.equal(state.loading, false);
  assert.equal(state.error, "");

  cleanup();
});

test("request role checks deny missing roles before calling the handler", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.secure"
      data-vd-target="result"
      data-vd-loading="loading"
      data-vd-error="error"
    >Load</button>
  `);
  let handlerCalls = 0;
  configureRequestRuntime({
    auth: {
      defaultProvider: "test",
      providers: {
        test() {
          return {
            authenticated: true,
            roles: ["viewer"]
          };
        }
      }
    },
    routes: {
      "posts.secure": {
        handler() {
          handlerCalls += 1;

          return {
            ok: true
          };
        },
        roles: ["admin"]
      }
    }
  });
  const events = createPageEventHub();
  const errors = [];
  events.on(VD_REQUEST.EVENTS.ERROR, event => {
    errors.push(event);
  });
  const state = createState({
    emit: events.emit,
    error: "",
    loading: false,
    result: null
  });

  await withoutConsoleError(async messages => {
    const cleanup = await applyDirectives(root, state);

    root.querySelector("button").click();
    await waitFor(() => {
      assert.equal(errors.length, 1);
    });

    assert.equal(handlerCalls, 0);
    assert.equal(state.loading, false);
    assert.equal(state.result, null);
    assert.match(state.error, /Access denied/);
    assert.equal(errors[0].stage, VD_REQUEST.STAGES.AUTH);
    assert.match(errors[0].message, /Required roles: admin/);
    assert.match(messages[0], /Request Authorization Failed/);

    cleanup();
  });
});

test("invalid request config reports a configuration error without calling the route", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.load"
      data-vd-request-config="'not an object'"
    >Load</button>
  `);
  let handlerCalls = 0;
  configureRequestRuntime({
    routes: {
      "posts.load": () => {
        handlerCalls += 1;
      }
    }
  });
  const events = createPageEventHub();
  const errors = [];
  events.on(VD_REQUEST.EVENTS.ERROR, event => {
    errors.push(event);
  });
  const state = createState({
    emit: events.emit
  });

  await withoutConsoleError(async messages => {
    const cleanup = await applyDirectives(root, state);

    root.querySelector("button").click();
    await waitFor(() => {
      assert.equal(errors.length, 1);
    });

    assert.equal(handlerCalls, 0);
    assert.equal(errors[0].stage, VD_REQUEST.STAGES.CONFIG);
    assert.equal(errors[0].code, VD_REQUEST.CODES.INVALID_CONFIG);
    assert.match(messages[0], /Invalid Request Config/);

    cleanup();
  });
});

function createRoot(html) {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

function createPageOptions(pageStates) {
  return {
    page: "features",
    getPageState: pageName => pageStates[pageName],
    hasPage: pageName => Object.hasOwn(pageStates, pageName)
  };
}

async function withoutConsoleError(callback) {
  const original = console.error;
  const messages = [];

  console.error = message => {
    messages.push(String(message));
  };

  try {
    await callback(messages);
  } finally {
    console.error = original;
  }
}
