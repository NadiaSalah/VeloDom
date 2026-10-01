/** Exercises the real edit script with app links, Back and native unload. */
import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../../../packages/velodom/src/index.ts";
import * as editScript from "../../../examples/velodom-store/src/pages/admin/products/[id]/edit/script.js";
import { confirmEditDeparture } from "../../../examples/velodom-store/src/domain/forms/unsaved-edit.js";
import { installDom, waitFor } from "../../test-support/dom.js";

test("dirty edit protects app navigation and Back, but a saved or released draft does not", async () => {
  const removeDom = installDom();
  const previousConfirm = window.confirm;
  let allowed = false;
  let prompts = 0;
  window.confirm = () => { prompts++; return allowed; };
  document.body.innerHTML = '<div id="app"></div>';
  history.replaceState({}, "", "/admin/products/focus-timer/edit");
  const pages = { edit: "admin/products/[id]/edit", list: "admin/products" };
  let editState;
  const record = {
    id: "focus-timer", name: "Focus dial timer", summary: "A useful timer for the desk.",
    status: "active", revision: 1
  };
  const app = createApp({
    router: { beforeEach: confirmEditDeparture },
    adapter: { pages: {
      html: {
        [pages.edit]: async () => '<h1 data-vd-text="draft.name"></h1>',
        [pages.list]: async () => "<h1>Product list</h1>"
      },
      data: { [pages.edit]: async () => ({ load: () => record }) },
      modules: { [pages.edit]: async () => ({
        ...editScript,
        init({ state, data, ctx }) {
          editState = state;
          return editScript.init({ state, data, ctx });
        }
      }) }
    } }
  });
  try {
    await app.mount();
    assert.equal(editState.dirty, false);
    editState.writeMode = "error";
    editState.markDirty();
    assert.equal(editState.dirty, false);

    editState.draft.name = "Unsaved timer";
    editState.markDirty();
    assert.equal(editState.dirty, true);
    const beforeUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(beforeUnload);
    assert.equal(beforeUnload.defaultPrevented, true);

    assert.equal(await app.navigate("/admin/products"), false);
    assert.equal(location.pathname, "/admin/products/focus-timer/edit");
    assert.equal(editState.draft.name, "Unsaved timer");
    history.pushState({}, "", "/admin/products");
    window.dispatchEvent(new Event("popstate"));
    await waitFor(() => assert.equal(location.pathname, "/admin/products/focus-timer/edit"));
    assert.equal(prompts, 2);

    editState.draft.name = record.name;
    editState.markDirty();
    assert.equal(editState.dirty, false);
    const cleanUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(cleanUnload);
    assert.equal(cleanUnload.defaultPrevented, false);
    editState.draft.name = "Another unsaved timer";
    editState.markDirty();
    allowed = true;
    assert.equal(await app.navigate("/admin/products"), true);
    assert.equal(prompts, 3);
    const departedUnload = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(departedUnload);
    assert.equal(departedUnload.defaultPrevented, false);
  } finally {
    await app.destroy();
    window.confirm = previousConfirm;
    removeDom();
  }
});
