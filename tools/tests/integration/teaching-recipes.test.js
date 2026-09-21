/**
 * ----------------------------------------
 * Module: Taught List and Form Recipes
 * ----------------------------------------
 *
 * Verifies the exact HTML snippets displayed by the educational application,
 * so documentation cannot drift from compiler, request, or form behavior.
 * ----------------------------------------
 */

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { compileTemplate } from "../../../packages/velodom/src/compiler/index.ts";
import { applyDirectives } from "../../../packages/velodom/src/directives.ts";
import { createPluginManager } from "../../../packages/velodom/src/plugins.ts";
import { createProgressiveFormsPlugin } from "../../../packages/velodom/src/progressive-forms.ts";
import { createState } from "../../../packages/velodom/src/reactive.ts";
import { configureRequestRuntime } from "../../../packages/velodom/src/requests/request-router.ts";
import { createValidationPlugin } from "../../../packages/velodom/src/validation.ts";
import { installDom, waitFor } from "../../test-support/dom.js";

const removeDom = installDom();

test.after(() => {
  removeDom();
});

test.beforeEach(() => {
  document.body.innerHTML = "";
  configureRequestRuntime();
});

test("taught list recipe renders loading, success, empty, and error states", async () => {
  const root = createCompiledRecipe(await readRecipe("request-list"));
  const outcomes = [
    { items: [{ id: 1, name: "Keyboard" }] },
    { items: [] },
    new Error("Catalog unavailable.")
  ];
  let resolveRequest;
  let rejectRequest;
  let call = 0;

  configureRequestRuntime({
    routes: {
      "catalog.list": () => new Promise((resolve, reject) => {
        resolveRequest = resolve;
        rejectRequest = reject;
      })
    }
  });
  const state = createState({
    productsError: "",
    productsLoading: false,
    productsResult: null
  });
  const cleanup = await applyDirectives(root, state);
  const button = root.querySelector("button");

  async function runNext() {
    const outcome = outcomes[call];
    call += 1;
    button.click();
    await waitFor(() => assert.equal(state.productsLoading, true));

    if (outcome instanceof Error) rejectRequest(outcome);
    else resolveRequest(outcome);

    await waitFor(() => assert.equal(state.productsLoading, false));
  }

  await runNext();
  assert.equal(isTextVisible(root, "Keyboard"), true);
  assert.equal(isTextVisible(root, "No products found."), false);

  await runNext();
  assert.equal(isTextVisible(root, "No products found."), true);
  assert.equal(isTextVisible(root, "Keyboard"), false);

  await withoutConsoleError(async messages => {
    await runNext();
    assert.equal(isTextVisible(root, "Catalog unavailable."), true);
    assert.equal(isTextVisible(root, "No products found."), false);
    assert.equal(messages.some(message => message.includes("VD_REQUEST_FAILED")), true);
  });

  cleanup();
});

test("taught progressive form preserves native validation and server feedback", async () => {
  const root = createCompiledRecipe(await readRecipe("progressive-form"));
  document.body.append(root);
  const responses = [
    createResponse(422, {
      message: "Please fix the form.",
      errors: { email: "This email is already registered." }
    }),
    createResponse(201, { message: "Message sent." })
  ];
  let requestCount = 0;
  const manager = createPluginManager([
    createValidationPlugin({ reportValidity: false }),
    createProgressiveFormsPlugin({
      fetch: async () => responses[requestCount++]
    })
  ]);
  const form = root.querySelector("form");
  const email = root.querySelector("input[name='email']");

  await manager.setup();
  submit(form);
  assert.equal(requestCount, 0);
  assert.equal(email.hasAttribute("data-vd-field-invalid"), true);

  email.value = "taken@example.com";
  submit(form);
  await waitFor(() => {
    assert.equal(form.getAttribute("data-vd-form-state"), "error");
  });
  assert.equal(requestCount, 1);
  assert.match(root.querySelector("[data-vd-form-error='email']").textContent, /already registered/);
  assert.match(root.querySelector("[data-vd-form-status]").textContent, /fix the form/);

  email.value = "reader@example.com";
  submit(form);
  await waitFor(() => {
    assert.equal(form.getAttribute("data-vd-form-state"), "success");
  });
  assert.equal(requestCount, 2);
  assert.equal(root.querySelector("[data-vd-form-status]").textContent, "Message sent.");

  await manager.destroy();
});

async function readRecipe(name) {
  const source = await readFile(new URL(
    "../../../examples/velodom-blog/src/pages/features/index.html",
    import.meta.url
  ), "utf8");
  const page = document.createElement("div");
  page.innerHTML = source;
  const recipe = page.querySelector(`pre[data-recipe="${name}"] code`);

  assert.ok(recipe, `Missing taught recipe ${name}`);
  return recipe.textContent;
}

function createCompiledRecipe(source) {
  const root = document.createElement("div");
  root.innerHTML = compileTemplate(source).html;
  document.body.append(root);
  return root;
}

function submit(form) {
  form.dispatchEvent(new Event("submit", {
    bubbles: true,
    cancelable: true
  }));
}

function isTextVisible(root, text) {
  const element = [...root.querySelectorAll("p, li")].find(candidate => (
    candidate.textContent.trim() === text
  ));

  return Boolean(element && element.style.display !== "none");
}

async function withoutConsoleError(callback) {
  const original = console.error;
  const messages = [];
  console.error = message => messages.push(String(message));

  try {
    await callback(messages);
  } finally {
    console.error = original;
  }
}

function createResponse(status, data) {
  return {
    headers: {
      get(name) {
        return name === "content-type" ? "application/json" : null;
      }
    },
    async json() {
      return data;
    },
    ok: status >= 200 && status < 300,
    redirected: false,
    status,
    async text() {
      return JSON.stringify(data);
    },
    url: ""
  };
}
