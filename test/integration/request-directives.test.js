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

test("auth failures can redirect through route config", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.secure"
      data-vd-target="result"
      data-vd-error="error"
    >Load</button>
  `);
  const navigations = [];

  configureRequestRuntime({
    auth: {
      defaultProvider: "test",
      providers: {
        test() {
          return {
            authenticated: false
          };
        }
      }
    },
    routes: {
      "posts.secure": {
        handler() {
          return "forbidden";
        },
        auth: true,
        authRedirect: "/login"
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
    result: null
  });

  await withoutConsoleError(async () => {
    const cleanup = await applyDirectives(root, state, {
      navigate(path) {
        navigations.push(path);
      }
    });

    root.querySelector("button").click();
    await waitFor(() => {
      assert.deepEqual(navigations, [
        "/login"
      ]);
    });

    assert.equal(state.result, null);
    assert.match(state.error, /Authentication required/);
    assert.equal(errors[0].stage, VD_REQUEST.STAGES.AUTH);

    cleanup();
  });
});

test("request config auth redirect overrides route redirect", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.secure"
      data-vd-request-config="{
        target: 'result',
        error: 'error',
        redirectOnAuthFailure: '/signin'
      }"
    >Load</button>
  `);
  const navigations = [];

  configureRequestRuntime({
    auth: {
      defaultProvider: "test",
      providers: {
        test() {
          return null;
        }
      }
    },
    routes: {
      "posts.secure": {
        handler() {
          return "forbidden";
        },
        auth: true,
        authRedirect: "/login"
      }
    }
  });

  const state = createState({
    error: "",
    result: null
  });

  await withoutConsoleError(async () => {
    const cleanup = await applyDirectives(root, state, {
      navigate(path) {
        navigations.push(path);
      }
    });

    root.querySelector("button").click();
    await waitFor(() => {
      assert.deepEqual(navigations, [
        "/signin"
      ]);
    });

    cleanup();
  });
});

test("invalid auth redirect path reports a configuration error", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.secure"
      data-vd-request-config="{ authRedirect: 'https://example.test/login' }"
    >Load</button>
  `);
  let handlerCalls = 0;

  configureRequestRuntime({
    routes: {
      "posts.secure": () => {
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
    assert.match(messages[0], /Invalid Request Auth Redirect/);

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

test("request config debounce runs only the latest scheduled request", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.search"
      data-vd-request-config="{
        params: { q: query },
        target: 'searchResult',
        autoState: true,
        debounceMs: 20
      }"
    >Search</button>
  `);
  const calls = [];

  configureRequestRuntime({
    routes: {
      "posts.search": params => {
        calls.push(params);

        return {
          query: params.q
        };
      }
    }
  });

  const state = createState({
    query: "a",
    searchError: "old error",
    searchLoading: false,
    searchResult: null
  });
  const cleanup = await applyDirectives(root, state);
  const button = root.querySelector("button");

  button.click();
  state.query = "ab";
  button.click();
  state.query = "abc";
  button.click();

  assert.equal(calls.length, 0);
  assert.equal(state.searchLoading, false);

  await delay(35);
  await waitFor(() => {
    assert.equal(calls.length, 1);
  });

  assert.deepEqual(calls[0], {
    q: "abc"
  });
  assert.deepEqual(state.searchResult, {
    query: "abc"
  });
  assert.equal(state.searchLoading, false);
  assert.equal(state.searchError, "");

  cleanup();
});

test("request debounce attribute accepts expression values", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.search"
      data-vd-debounce="searchDelay"
      data-vd-params="{ q: query }"
      data-vd-target="result"
    >Search</button>
  `);
  let handlerCalls = 0;

  configureRequestRuntime({
    routes: {
      "posts.search": params => {
        handlerCalls += 1;

        return params.q;
      }
    }
  });

  const state = createState({
    query: "velodom",
    result: "",
    searchDelay: 15
  });
  const cleanup = await applyDirectives(root, state);

  root.querySelector("button").click();
  assert.equal(handlerCalls, 0);

  await delay(25);
  await waitFor(() => {
    assert.equal(state.result, "velodom");
  });
  assert.equal(handlerCalls, 1);

  cleanup();
});

test("invalid request debounce reports a configuration error", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.search"
      data-vd-debounce="-1"
    >Search</button>
  `);
  let handlerCalls = 0;

  configureRequestRuntime({
    routes: {
      "posts.search": () => {
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
    assert.match(messages[0], /Invalid Request Debounce/);

    cleanup();
  });
});

test("request config throttle limits rapid repeated requests", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.save"
      data-vd-request-config="{
        params: { title },
        target: 'result',
        throttleMs: 25
      }"
    >Save</button>
  `);
  const calls = [];

  configureRequestRuntime({
    routes: {
      "posts.save": params => {
        calls.push(params);

        return params.title;
      }
    }
  });

  const state = createState({
    result: "",
    title: "first"
  });
  const cleanup = await applyDirectives(root, state);
  const button = root.querySelector("button");

  button.click();
  state.title = "ignored";
  button.click();
  button.click();

  await waitFor(() => {
    assert.equal(state.result, "first");
  });
  assert.equal(calls.length, 1);

  await delay(35);
  state.title = "second";
  button.click();

  await waitFor(() => {
    assert.equal(state.result, "second");
  });
  assert.deepEqual(calls, [
    {
      title: "first"
    },
    {
      title: "second"
    }
  ]);

  cleanup();
});

test("request throttle attribute accepts expression values", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.save"
      data-vd-throttle="saveDelay"
      data-vd-params="{ title }"
      data-vd-target="result"
    >Save</button>
  `);
  let handlerCalls = 0;

  configureRequestRuntime({
    routes: {
      "posts.save": params => {
        handlerCalls += 1;

        return params.title;
      }
    }
  });

  const state = createState({
    result: "",
    saveDelay: 25,
    title: "draft"
  });
  const cleanup = await applyDirectives(root, state);
  const button = root.querySelector("button");

  button.click();
  button.click();

  await waitFor(() => {
    assert.equal(state.result, "draft");
  });
  assert.equal(handlerCalls, 1);

  cleanup();
});

test("invalid request throttle reports a configuration error", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.save"
      data-vd-throttle="-1"
    >Save</button>
  `);
  let handlerCalls = 0;

  configureRequestRuntime({
    routes: {
      "posts.save": () => {
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
    assert.match(messages[0], /Invalid Request Throttle/);

    cleanup();
  });
});

test("request config retry repeats transient request failures", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.save"
      data-vd-request-config="{
        params: { title },
        target: 'result',
        error: 'error',
        retry: 2,
        retryDelayMs: 1
      }"
    >Save</button>
  `);
  let attempts = 0;

  configureRequestRuntime({
    routes: {
      "posts.save": params => {
        attempts += 1;

        if (attempts < 3) {
          throw new Error("Temporary failure");
        }

        return {
          title: params.title
        };
      }
    }
  });

  const state = createState({
    error: "",
    result: null,
    title: "Recovered"
  });
  const cleanup = await applyDirectives(root, state);

  root.querySelector("button").click();

  await waitFor(() => {
    assert.deepEqual(state.result, {
      title: "Recovered"
    });
  });

  assert.equal(attempts, 3);
  assert.equal(state.error, "");

  cleanup();
});

test("request config retry true performs one extra attempt", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.save"
      data-vd-request-config="{
        target: 'result',
        retry: true
      }"
    >Save</button>
  `);
  let attempts = 0;

  configureRequestRuntime({
    routes: {
      "posts.save": () => {
        attempts += 1;

        if (attempts === 1) {
          throw new Error("Retry once");
        }

        return "saved";
      }
    }
  });

  const state = createState({
    result: ""
  });
  const cleanup = await applyDirectives(root, state);

  root.querySelector("button").click();

  await waitFor(() => {
    assert.equal(state.result, "saved");
  });
  assert.equal(attempts, 2);

  cleanup();
});

test("invalid request retry reports a configuration error", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.save"
      data-vd-request-config="{ retry: -1 }"
    >Save</button>
  `);
  let handlerCalls = 0;

  configureRequestRuntime({
    routes: {
      "posts.save": () => {
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
    assert.match(messages[0], /Invalid Request Config Value/);

    cleanup();
  });
});

test("global request hooks observe successful declarative requests", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.save"
      data-vd-target="result"
      data-vd-params="{ title }"
    >Save</button>
  `);
  const hooks = [];

  configureRequestRuntime({
    hooks: {
      beforeRequest(payload) {
        hooks.push([
          "before",
          payload.route,
          payload.params.title
        ]);
      },
      afterRequest(payload) {
        hooks.push([
          "after",
          payload.route,
          payload.ok,
          payload.result
        ]);
      }
    },
    routes: {
      "posts.save": params => `saved:${params.title}`
    }
  });

  const state = createState({
    result: "",
    title: "hooked"
  });
  const cleanup = await applyDirectives(root, state);

  root.querySelector("button").click();

  await waitFor(() => {
    assert.equal(state.result, "saved:hooked");
  });
  assert.deepEqual(hooks, [
    [
      "before",
      "posts.save",
      "hooked"
    ],
    [
      "after",
      "posts.save",
      true,
      "saved:hooked"
    ]
  ]);

  cleanup();
});

test("global before request hook can cancel a declarative request", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.save"
      data-vd-target="result"
      data-vd-loading="loading"
    >Save</button>
  `);
  const hooks = [];
  let handlerCalls = 0;

  configureRequestRuntime({
    hooks: {
      beforeRequest() {
        hooks.push("before");

        return false;
      },
      afterRequest(payload) {
        hooks.push([
          "after",
          payload.ok
        ]);
      }
    },
    routes: {
      "posts.save": () => {
        handlerCalls += 1;

        return "should not run";
      }
    }
  });

  const state = createState({
    loading: false,
    result: ""
  });
  const cleanup = await applyDirectives(root, state);

  root.querySelector("button").click();
  await waitFor(() => {
    assert.deepEqual(hooks, [
      "before",
      [
        "after",
        false
      ]
    ]);
  });

  assert.equal(handlerCalls, 0);
  assert.equal(state.result, "");
  assert.equal(state.loading, false);

  cleanup();
});

test("request config onSuccess callback runs after state is written", async () => {
  const root = createRoot(`
    <button
      data-vd-request="posts.save"
      data-vd-request-config="{
        target: 'result',
        onSuccess: rememberSuccess
      }"
    >Save</button>
  `);

  configureRequestRuntime({
    routes: {
      "posts.save": () => "saved"
    }
  });

  const state = createState({
    result: "",
    successSeen: "",
    rememberSuccess(payload) {
      state.successSeen = `${state.result}:${payload.result}`;
    }
  });
  const cleanup = await applyDirectives(root, state);

  root.querySelector("button").click();

  await waitFor(() => {
    assert.equal(state.successSeen, "saved:saved");
  });

  cleanup();
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

function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
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
