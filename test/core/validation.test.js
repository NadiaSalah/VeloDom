import assert from "node:assert/strict";
import test from "node:test";
import { createPluginManager } from "../../src/core/plugins.ts";
import { createValidationPlugin } from "../../src/core/validation.ts";
import { installDom } from "../../test-support/dom.js";

const removeDom = installDom();

test.after(() => {
  removeDom();
});

test.beforeEach(() => {
  document.body.innerHTML = "";
});

test("validation plugin blocks invalid opt-in forms before submit handlers", async () => {
  document.body.innerHTML = `
    <form data-vd-validate>
      <input name="title" required>
      <button type="submit">Save</button>
    </form>
  `;
  const manager = createPluginManager([
    createValidationPlugin({
      reportValidity: false
    })
  ]);
  const form = document.querySelector("form");
  const input = document.querySelector("input");
  let submitted = 0;
  const onSubmit = () => {
    submitted += 1;
  };

  await manager.setup();
  document.addEventListener("submit", onSubmit);

  const invalidEvent = new Event("submit", {
    bubbles: true,
    cancelable: true
  });

  form.dispatchEvent(invalidEvent);

  assert.equal(invalidEvent.defaultPrevented, true);
  assert.equal(submitted, 0);
  assert.equal(form.hasAttribute("data-vd-invalid"), true);
  assert.equal(input.hasAttribute("data-vd-field-invalid"), true);

  input.value = "A valid title";
  input.dispatchEvent(new Event("input", {
    bubbles: true
  }));

  const validEvent = new Event("submit", {
    bubbles: true,
    cancelable: true
  });

  form.dispatchEvent(validEvent);

  assert.equal(validEvent.defaultPrevented, false);
  assert.equal(submitted, 1);
  assert.equal(form.hasAttribute("data-vd-invalid"), false);
  assert.equal(input.hasAttribute("data-vd-field-invalid"), false);

  document.removeEventListener("submit", onSubmit);
  await manager.destroy();
});

test("validation plugin ignores forms without validation opt-in", async () => {
  document.body.innerHTML = `
    <form>
      <input name="title" required>
      <button type="submit">Save</button>
    </form>
  `;
  const manager = createPluginManager([
    createValidationPlugin({
      reportValidity: false
    })
  ]);
  const form = document.querySelector("form");
  let submitted = 0;
  const onSubmit = () => {
    submitted += 1;
  };

  await manager.setup();
  document.addEventListener("submit", onSubmit);

  const event = new Event("submit", {
    bubbles: true,
    cancelable: true
  });

  form.dispatchEvent(event);

  assert.equal(event.defaultPrevented, false);
  assert.equal(submitted, 1);
  assert.equal(form.hasAttribute("data-vd-invalid"), false);

  document.removeEventListener("submit", onSubmit);
  await manager.destroy();
});
