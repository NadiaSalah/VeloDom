import assert from "node:assert/strict";
import test from "node:test";
import {
  createDevtoolsRuntimeSession
} from "../../../packages/velodom/src/devtools/runtime.ts";
import {
  serializeDevtoolsValue
} from "../../../packages/velodom/src/devtools/serializer.ts";
import {
  createState
} from "../../../packages/velodom/src/reactive.ts";
import {
  createPageRouter
} from "../../../packages/velodom/src/page-router.ts";
import { installDom } from "../../test-support/dom.js";

test("devtools serializer bounds values without invoking accessors", () => {
  let reads = 0;
  const value = {
    deep: { child: { value: 1 } },
    long: "abcdefghij"
  };

  Object.defineProperty(value, "secret", {
    enumerable: true,
    get() {
      reads += 1;
      return "unsafe";
    }
  });
  value.circular = value;

  assert.deepEqual(serializeDevtoolsValue(value, {
    maxDepth: 2,
    maxEntries: 10,
    maxStringLength: 16
  }), {
    deep: {
      child: {
        __vdType: "Truncated",
        reason: "max-depth"
      }
    },
    long: "abcdefghij",
    secret: {
      __vdType: "Accessor"
    },
    circular: {
      __vdType: "Circular"
    }
  });
  assert.equal(reads, 0);
});

test("devtools session records bounded state, event, binding, and DOM updates", async () => {
  const restore = installDom();

  try {
    document.body.innerHTML = `
      <main id="app">
        <button data-vd-on-click="increment()">
          <span data-vd-text="count">0</span>
        </button>
      </main>
    `;
    const app = {
      async destroy() {},
      async mount() {},
      async navigate() {}
    };
    const session = createDevtoolsRuntimeSession(app, {
      eventLimit: 10
    });
    const state = createState({ count: 0 });
    const root = document.querySelector("#app");
    const release = session.registerScope({
      kind: "page",
      name: "home",
      root,
      source: "src/pages/home/index.html",
      state
    });

    session.setRoute({
      hash: "",
      matched: true,
      page: "home",
      params: {},
      path: "/",
      query: {}
    });
    state.count = 1;
    root.querySelector("span").textContent = "1";
    root.querySelector("button").dispatchEvent(new Event("click", {
      bubbles: true
    }));
    await new Promise(resolve => setTimeout(resolve, 0));

    const snapshot = session.inspect();
    const page = snapshot.scopes.find(scope => scope.id === "page:home");

    assert.equal(snapshot.protocolVersion, 1);
    assert.equal(snapshot.route.path, "/");
    assert.equal(page.state.count, 1);
    assert.equal(page.bindings.length, 2);
    assert.ok(snapshot.events.some(event => event.type === "state:update"));
    assert.ok(snapshot.events.some(event => event.type === "event:dispatch"));
    assert.ok(snapshot.events.some(event => event.type === "binding:update"));
    assert.ok(snapshot.events.some(event => event.type === "dom:update"));

    for (let index = 0; index < 20; index += 1) {
      session.emit("state:update", { index });
    }
    assert.equal(session.inspect().events.length, 10);

    release();
    assert.equal(session.inspect().scopes.length, 0);
    session.destroy();
  } finally {
    restore();
  }
});

test("page router publishes real route and page lifecycle data only to an installed session", async () => {
  const restore = installDom();

  try {
    document.body.innerHTML = '<div id="app"></div>';
    history.replaceState({}, "", "/");
    const app = {
      shared: {}
    };
    const router = createPageRouter({
      pages: {
        html: {
          home: async () => '<h1 data-vd-text="title"></h1>'
        },
        manifests: {
          home: async () => ({
            directives: ["data-vd-text"],
            features: ["text"]
          })
        },
        modules: {
          home: async () => ({
            state: { title: "Inspected home" }
          })
        }
      }
    }, {}, null, app);
    // Application plugins install after router construction and before init.
    const session = createDevtoolsRuntimeSession(app);

    await router.init();

    const snapshot = session.inspect();

    assert.equal(snapshot.route.path, "/");
    assert.equal(snapshot.scopes[0].kind, "page");
    assert.equal(snapshot.scopes[0].name, "home");
    assert.equal(snapshot.scopes[0].state.title, "Inspected home");
    assert.ok(snapshot.events.some(event => event.type === "route:navigate:start"));
    assert.ok(snapshot.events.some(event => event.type === "route:navigate:end"));
    assert.ok(snapshot.events.some(event => event.type === "page:mount"));
    const routeEvents = snapshot.events.filter(event => (
      event.type === "route:navigate:start" || event.type === "route:navigate:end"
    ));
    assert.equal(routeEvents[0].payload.navigationId, routeEvents[1].payload.navigationId);

    await router.destroy();
    assert.equal(session.inspect().scopes.length, 0);
    session.destroy();
  } finally {
    restore();
  }
});
