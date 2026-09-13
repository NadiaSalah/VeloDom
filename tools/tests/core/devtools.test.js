import assert from "node:assert/strict";
import test from "node:test";
import {
  mountDevtoolsInspector,
  mountVeloDomLab
} from "../../../packages/velodom/src/devtools.ts";
import { installDom } from "../../test-support/dom.js";

test("standalone devtools inspector is opt-in and reads the registered bridge", () => {
  const restore = installDom();

  try {
    window.__VELODOM_DEVTOOLS__ = {
      inspect: () => ({ sharedStateNames: ["ui"] })
    };
    const handle = mountDevtoolsInspector();
    const panel = document.querySelector("[data-velodom-inspector]");

    assert.match(panel.textContent, /sharedStateNames/);
    assert.match(panel.textContent, /ui/);

    handle.destroy();
    assert.equal(document.querySelector("[data-velodom-inspector]"), null);
  } finally {
    restore();
  }
});

test("standalone devtools inspector refuses implicit bridge installation", () => {
  const restore = installDom();

  try {
    assert.throws(
      () => mountDevtoolsInspector(),
      /createDevtoolsPlugin/
    );
  } finally {
    restore();
  }
});

test("VeloDom Lab renders live bridge and compiler data in an isolated panel", async () => {
  const restore = installDom();
  let highlighted = "";
  let copied = "";
  let listener = null;

  try {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText(value) {
          copied = value;
          return Promise.resolve();
        }
      }
    });
    window.__VELODOM_DEVTOOLS__ = {
      clearEvents() {},
      highlight(id) {
        highlighted = id;
        return true;
      },
      inspect: () => ({
        events: [
          { id: 1, payload: { from: null, navigationId: 1, path: "/" }, timestamp: Date.now() - 20, type: "route:navigate:start", version: 1 },
          { id: 2, payload: { durationMs: 12, navigationId: 1, path: "/" }, timestamp: Date.now() - 8, type: "route:navigate:end", version: 1 },
          { id: 3, payload: { changes: [{ key: "title", previous: "Old", value: "Hello" }], scopeId: "page:home" }, timestamp: Date.now() - 6, type: "state:update", version: 1 },
          { id: 4, payload: { requestId: 7, route: "posts.get", target: "posts" }, timestamp: Date.now() - 5, type: "request:start", version: 1 },
          { id: 5, payload: { durationMs: 4, requestId: 7, route: "posts.get", status: "success" }, timestamp: Date.now() - 1, type: "request:end", version: 1 }
        ],
        protocolVersion: 1,
        route: {
          hash: "",
          matched: true,
          page: "home",
          params: {},
          path: "/",
          query: {}
        },
        scopes: [{
          bindings: [{
            directive: "vd-text",
            expression: "title",
            id: "page:home:binding:1",
            target: "h1",
            updates: 1
          }],
          id: "page:home",
          kind: "page",
          name: "home",
          source: "src/pages/home/index.html",
          state: { title: "Hello" },
          updates: 1
        }, {
          bindings: [],
          id: "component:card:1",
          kind: "component",
          name: "card",
          parentId: "page:home",
          source: "src/components/card/index.html",
          state: {},
          updates: 0
        }],
        sharedStateNames: []
      }),
      subscribe(callback) {
        listener = callback;
        return () => { listener = null; };
      }
    };
    const compiler = encodeURIComponent(JSON.stringify({
      records: [{
        diagnostics: [{
          code: "VD_COMPILER_EXPRESSION",
          column: 4,
          line: 2,
          message: "Invalid expression",
          severity: "error"
        }],
        directives: [{
          argument: "",
          expression: "title",
          name: "vd-text",
          type: "text"
        }],
        features: ["text"],
        file: "src/pages/home/index.html"
      }]
    }));
    const handle = mountVeloDomLab({
      metadataUrl: `data:application/json,${compiler}`,
      open: true
    });

    await handle.refresh();
    const host = document.querySelector("[data-velodom-lab]");
    const shadow = host.shadowRoot;

    assert.match(shadow.textContent, /Protocol v1/);
    assert.match(shadow.textContent, /Runtime overview/);
    shadow.querySelector("[data-tab='components']").click();
    assert.match(shadow.textContent, /Mounted scopes/);
    assert.equal(
      shadow.querySelector("[data-highlight='component:card:1']").style.getPropertyValue("--vd-depth"),
      "1"
    );
    shadow.querySelector("[data-highlight='page:home']").click();
    assert.equal(highlighted, "page:home");
    shadow.querySelector("[data-tab='state']").click();
    assert.match(shadow.textContent, /Recent state diffs/);
    shadow.querySelector("[data-tab='requests']").click();
    assert.match(shadow.textContent, /Request waterfall/);
    assert.match(shadow.textContent, /posts.get · success/);
    shadow.querySelector("[data-tab='timeline']").click();
    assert.match(shadow.textContent, /Route-transition timeline/);
    assert.match(shadow.textContent, /start → \/ · complete/);
    shadow.querySelector("[data-tab='compiler']").click();
    assert.match(shadow.textContent, /Directive\/source inspection/);
    assert.match(shadow.textContent, /VD_COMPILER_EXPRESSION/);
    shadow.querySelector("[data-copy*='VD_COMPILER_EXPRESSION']").click();
    await Promise.resolve();
    assert.equal(copied, "vd explain VD_COMPILER_EXPRESSION");
    assert.equal(typeof listener, "function");

    handle.destroy();
    assert.equal(document.querySelector("[data-velodom-lab]"), null);
    assert.equal(listener, null);
  } finally {
    delete window.__VELODOM_DEVTOOLS__;
    restore();
  }
});
