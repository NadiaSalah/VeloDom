import assert from "node:assert/strict";
import test from "node:test";
import { mountDevtoolsInspector } from "../../../packages/velodom/src/devtools.ts";
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
