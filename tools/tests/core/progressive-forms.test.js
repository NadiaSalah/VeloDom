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
import { VD_FORMS } from "../../../packages/velodom/src/constants.ts";
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
  assert.equal(input.getAttribute("aria-errormessage"), form.querySelector("[data-vd-form-error]").id);
  assert.ok(form.querySelector("[data-vd-form-error]").id);
  assert.equal(
    form.querySelector("[data-vd-form-error]").textContent,
    "Enter a valid email address."
  );
  assert.equal(form.querySelector("[data-vd-form-status]").textContent, "Please fix the form.");

  await manager.destroy();

  assert.equal(input.getAttribute("aria-errormessage"), form.querySelector("[data-vd-form-error]").id);

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

test("ignored-abort form transport cannot emit success or redirect after cleanup", async () => {
  document.body.innerHTML = '<form data-vd-form action="/upload" method="post"><input name="title" value="Draft"><p data-vd-form-status></p></form>';
  let finish;
  let signal;
  let successes = 0;
  let redirects = 0;
  const manager = createPluginManager([createProgressiveFormsPlugin({
    fetch: async (_url, options) => {
      signal = options.signal;
      return new Promise(resolve => { finish = resolve; });
    },
    onRedirect() { redirects++; }
  })]);
  const form = document.querySelector("form");
  form.addEventListener(VD_FORMS.SUCCESS_EVENT, () => { successes++; });
  await manager.setup();
  submit(form);
  await waitFor(() => assert.ok(finish));
  await manager.destroy();
  assert.equal(signal.aborted, true);
  finish(createResponse(200, { message: "Accepted", redirect: "/done" }));
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(successes, 0);
  assert.equal(redirects, 0);
  assert.equal(form.getAttribute("aria-busy"), "false");
});

test("removing an enhanced form aborts its pending upload without app teardown", async () => {
  document.body.innerHTML = '<form data-vd-form action="/upload" method="post" enctype="multipart/form-data"><input name="title" value="Draft"><input name="attachment" type="file"></form>';
  let signal;
  let body;
  let headers;
  const manager = createPluginManager([createProgressiveFormsPlugin({
    fetch: async (_url, options) => {
      signal = options.signal;
      body = options.body;
      headers = options.headers;
      return new Promise(() => {});
    }
  })]);
  const form = document.querySelector("form");
  const files = new window.DataTransfer();
  files.items.add(new window.File(["hello"], "notes.txt", { type: "text/plain" }));
  form.querySelector('input[type="file"]').files = files.files;
  await manager.setup();
  submit(form);
  await waitFor(() => assert.ok(signal));
  assert.equal(body instanceof FormData, true);
  assert.equal(body.get("attachment").name, "notes.txt");
  assert.equal(body.get("attachment").size, 5);
  assert.equal(headers, undefined);
  form.remove();
  await waitFor(() => assert.equal(signal.aborted, true));
  await manager.destroy();
});

test("redirect failure after accepted form submit keeps write success distinct", async () => {
  document.body.innerHTML = '<form data-vd-form action="/contact" method="post"><input name="title" value="Saved"><p data-vd-form-status></p></form>';
  let successes = 0;
  let requestErrors = 0;
  const manager = createPluginManager([createProgressiveFormsPlugin({
    fetch: async () => createResponse(201, { message: "Saved", redirect: "/next" }),
    onRedirect: async () => { throw new Error("Navigation unavailable"); }
  })]);
  const form = document.querySelector("form");
  form.addEventListener(VD_FORMS.SUCCESS_EVENT, () => { successes++; });
  form.addEventListener(VD_FORMS.ERROR_EVENT, () => { requestErrors++; });
  await manager.setup();
  submit(form);
  await waitFor(() => assert.match(form.querySelector("[data-vd-form-status]").textContent, /navigation could not be completed/));
  assert.equal(form.getAttribute("data-vd-form-state"), "success");
  assert.equal(successes, 1);
  assert.equal(requestErrors, 0);
  await manager.destroy();
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
