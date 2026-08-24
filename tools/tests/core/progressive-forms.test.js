/**
 * ----------------------------------------
 * Module: Progressive Forms Tests
 * ----------------------------------------
 *
 * Responsibilities:
 * - Verify optional native-form enhancement behavior.
 * - Preserve form data, server errors, and redirect ownership.
 * ----------------------------------------
 */

import assert from "node:assert/strict";
import test from "node:test";
import { createPluginManager } from "../../../packages/velodom/src/plugins.ts";
import {
  createProgressiveFormsPlugin
} from "../../../packages/velodom/src/progressive-forms.ts";
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
});

test("progressive forms preserve native fields and expose loading and success state", async () => {
  document.body.innerHTML = `
    <form data-vd-form action="/contact" method="post">
      <input name="email" value="reader@example.com">
      <input name="csrf" type="hidden" value="application-token">
      <button type="submit">Send</button>
      <p data-vd-form-status aria-live="polite"></p>
    </form>
  `;
  let request;
  const manager = createPluginManager([
    createProgressiveFormsPlugin({
      fetch: async (url, options) => {
        request = { url, options };

        return createResponse(201, {
          message: "Thanks for your message."
        });
      }
    })
  ]);
  const form = document.querySelector("form");

  await manager.setup();

  const event = submit(form);

  assert.equal(event.defaultPrevented, true);
  await waitFor(() => {
    assert.equal(form.getAttribute("data-vd-form-state"), "success");
  });

  assert.equal(form.hasAttribute("data-vd-form-loading"), false);
  assert.equal(form.querySelector("[data-vd-form-status]").textContent, "Thanks for your message.");
  assert.equal(request.url, "http://velodom.test/contact");
  assert.equal(request.options.method, "POST");
  assert.equal(request.options.credentials, "same-origin");
  assert.equal(request.options.body.get("email"), "reader@example.com");
  assert.equal(request.options.body.get("csrf"), "application-token");

  await manager.destroy();
});

test("progressive forms render server field errors and delegate redirects", async () => {
  document.body.innerHTML = `
    <form data-vd-form action="/contact" method="post">
      <input name="email" value="invalid">
      <button type="submit">Send</button>
      <p data-vd-form-status aria-live="polite"></p>
      <small data-vd-form-error="email"></small>
    </form>
  `;
  let redirectedTo = "";
  const manager = createPluginManager([
    createProgressiveFormsPlugin({
      fetch: async () => createResponse(422, {
        message: "Please fix the form.",
        errors: {
          email: "Enter a valid email address."
        }
      }),
      onRedirect: async url => {
        redirectedTo = url.pathname;
      }
    })
  ]);
  const form = document.querySelector("form");
  const input = document.querySelector("input");

  await manager.setup();
  submit(form);

  await waitFor(() => {
    assert.equal(form.getAttribute("data-vd-form-state"), "error");
  });

  assert.equal(input.getAttribute("aria-invalid"), "true");
  assert.equal(input.hasAttribute("data-vd-form-field-error"), true);
  assert.equal(
    form.querySelector("[data-vd-form-error]").textContent,
    "Enter a valid email address."
  );
  assert.equal(form.querySelector("[data-vd-form-status]").textContent, "Please fix the form.");

  await manager.destroy();

  document.body.innerHTML = `
    <form data-vd-form action="/contact" method="post">
      <input name="email" value="reader@example.com">
    </form>
  `;
  const redirectManager = createPluginManager([
    createProgressiveFormsPlugin({
      fetch: async () => createResponse(200, {
        redirect: "/thanks"
      }),
      onRedirect: async url => {
        redirectedTo = url.pathname;
      }
    })
  ]);
  const redirectForm = document.querySelector("form");

  await redirectManager.setup();
  submit(redirectForm);

  await waitFor(() => {
    assert.equal(redirectedTo, "/thanks");
  });

  await redirectManager.destroy();
});

test("progressive form cleanup aborts an in-flight submission", async () => {
  document.body.innerHTML = `
    <form data-vd-form action="/contact" method="post">
      <input name="email" value="reader@example.com">
    </form>
  `;
  let signal;
  const manager = createPluginManager([
    createProgressiveFormsPlugin({
      fetch: async (_url, options) => new Promise((_resolve, reject) => {
        signal = options.signal;
        options.signal.addEventListener("abort", () => reject(new Error("aborted")));
      })
    })
  ]);
  const form = document.querySelector("form");

  await manager.setup();
  submit(form);

  await waitFor(() => {
    assert.ok(signal);
  });
  await manager.destroy();

  assert.equal(signal.aborted, true);
});

function submit(form) {
  const event = new Event("submit", {
    bubbles: true,
    cancelable: true
  });

  form.dispatchEvent(event);
  return event;
}

function createResponse(status, data) {
  return {
    ok: status >= 200 && status < 300,
    status,
    redirected: false,
    url: "",
    headers: {
      get(name) {
        return name === "content-type" ? "application/json" : null;
      }
    },
    async json() {
      return data;
    },
    async text() {
      return JSON.stringify(data);
    }
  };
}
