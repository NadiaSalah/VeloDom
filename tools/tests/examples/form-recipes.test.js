/** Proves the optional teaching form's repeatable state and stale-safe check. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createApp } from "../../../packages/velodom/src/index.ts";
import { compileTemplate } from "../../../packages/velodom/src/compiler/index.ts";
import { createLatestValidation } from "../../../examples/velodom-blog/src/domain/forms/latest-validation.js";
import * as formScript from "../../../examples/velodom-blog/src/pages/forms/script.js";
import { installDom, waitFor } from "../../test-support/dom.js";

test("latest async validation fences an old ignored-abort result and page departure", async () => {
  const parent = new AbortController();
  const pending = [];
  const validation = createLatestValidation((value, signal) => new Promise(resolve => {
    pending.push({ value, signal, resolve });
  }), parent.signal);
  const old = validation.validate("old");
  const current = validation.validate("new");
  assert.equal(pending[0].signal.aborted, true);
  pending[0].resolve("old failure");
  pending[1].resolve("");
  assert.deepEqual(await old, { current: false, value: "old failure" });
  assert.deepEqual(await current, { current: true, value: "" });
  const departed = validation.validate("later");
  parent.abort();
  assert.equal(pending[2].signal.aborted, true);
  pending[2].resolve("late failure");
  assert.equal((await departed).current, false);
  validation.cancel();
});

test("real form lesson validates name, retains keyed repeatable drafts and reviews without a server write", async () => {
  const removeDom = installDom();
  document.body.innerHTML = '<div id="app"></div>';
  history.replaceState({}, "", "/forms");
  let state;
  const html = await readFile(new URL("../../../examples/velodom-blog/src/pages/forms/index.html", import.meta.url), "utf8");
  const app = createApp({ adapter: { pages: {
    html: {
      forms: async () => compileTemplate(html).html,
      other: async () => "<h1>Next page</h1>"
    },
    modules: { forms: async () => ({
      ...formScript,
      init({ state: pageState, ctx }) {
        state = pageState;
        return formScript.init({ state: pageState, ctx });
      }
    }) }
  } } });
  const event = { preventDefault() {}, currentTarget: { reportValidity: () => true } };
  try {
    await app.mount();
    assert.equal(state.step, 1);
    const nameInput = document.querySelector("#lesson-name");
    nameInput.value = "admin";
    nameInput.dispatchEvent(new Event("input", { bubbles: true }));
    await waitFor(() => assert.match(state.nameError, /reserved/), { attempts: 150 });
    assert.equal(await state.checkName("admin"), false);
    assert.equal(state.touched.name, true);
    assert.match(state.nameError, /reserved/);
    await state.nextStep(event);
    assert.equal(state.step, 1);
    assert.equal(await state.checkName("reader"), true);
    await state.nextStep(event);
    assert.equal(state.step, 2);
    const first = state.contacts[0];
    state.addContact();
    assert.equal(state.contacts.length, 2);
    state.updateContact(first.id, "reader@example.test");
    assert.deepEqual(state.touched.contacts, [first.id]);
    assert.equal(state.contacts[0].email, "reader@example.test");
    assert.equal(first.email, "");
    state.updateContact(state.contacts[1].id, "second@example.test");
    state.review(event);
    assert.equal(state.step, 3);
    assert.match(document.querySelector("main").textContent, /reader@example.test/);
    state.startAgain();
    assert.equal(state.contacts.length, 1);
    assert.equal(state.name, "");
    assert.deepEqual(state.touched, { name: false, contacts: [] });
    const pending = state.checkName("taken");
    await app.navigate("/other");
    assert.equal(await pending, false);
    assert.equal(document.querySelector("h1").textContent, "Next page");
  } finally {
    await app.destroy();
    removeDom();
  }
});
