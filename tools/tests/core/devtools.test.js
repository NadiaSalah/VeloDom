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
  let listener = null;

  try {
    window.__VELODOM_DEVTOOLS__ = {
      clearEvents() {},
      highlight(id) {
        highlighted = id;
        return true;
      },
      inspect: () => ({
        events: [{
          id: 1,
          payload: { scopeId: "page:home" },
          timestamp: Date.now(),
          type: "state:update",
          version: 1
        }],
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
        diagnostics: [],
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
    shadow.querySelector("[data-highlight='page:home']").click();
    assert.equal(highlighted, "page:home");
    assert.equal(typeof listener, "function");

    handle.destroy();
    assert.equal(document.querySelector("[data-velodom-lab]"), null);
    assert.equal(listener, null);
  } finally {
    delete window.__VELODOM_DEVTOOLS__;
    restore();
  }
});
