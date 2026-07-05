import assert from "node:assert/strict";
import test from "node:test";
import { applyDirectives } from "../../src/core/directives.ts";
import {
  reportUserActionError
} from "../../src/core/errors/error-reporter.ts";
import {
  renderFatalFrameworkError
} from "../../src/core/errors/error-screen.ts";
import { createState } from "../../src/core/reactive.ts";
import { installDom } from "../../test-support/dom.js";

const removeDom = installDom();

test.after(() => {
  removeDom();
});

test.beforeEach(() => {
  document.documentElement.removeAttribute("style");
  document.body.removeAttribute("style");
  document.body.innerHTML = "";
});

test("error reporter formats fallback location and directive context", async () => {
  const element = document.createElement("button");
  element.setAttribute("data-vd-on-click", "save()");
  element.innerHTML = "  Save\n post  ";

  await captureConsole("error", messages => {
    const reported = reportUserActionError("Save failed", {
      title: "Event Handler Error",
      directive: "data-vd-on-click",
      expression: "save()",
      file: "src/components/post-form/script.ts",
      line: 42,
      column: 7,
      el: element,
      hint: "Check save()."
    });

    assert.deepEqual(reported.location, {
      file: "src/components/post-form/script.ts",
      line: 42,
      column: 7
    });
    assert.equal(messages.length, 1);
    assert.match(messages[0], /^\[VeloDom\] Event Handler Error/m);
    assert.match(messages[0], /Message: Save failed/);
    assert.match(
      messages[0],
      /Location: src\/components\/post-form\/script\.ts:42:7/
    );
    assert.match(messages[0], /Directive: data-vd-on-click/);
    assert.match(messages[0], /Expression: save\(\)/);
    assert.match(
      messages[0],
      /Element: <button data-vd-on-click="save\(\)"> Save post <\/button>/
    );
    assert.match(messages[0], /Hint: Check save\(\)\./);
  });
});

test("error reporter extracts source locations from Windows stack frames", async () => {
  const error = new Error("Page initialization failed");
  error.stack = [
    "Error: Page initialization failed",
    "    at init (D:\\projects\\VeloDom\\src\\pages\\blog\\script.ts:18:12)"
  ].join("\n");

  await captureConsole("error", messages => {
    const reported = reportUserActionError(error, {
      file: "src/core/page-router.ts",
      line: 1
    });

    assert.deepEqual(reported.location, {
      file: "src/pages/blog/script.ts",
      line: 18,
      column: 12
    });
    assert.match(
      messages[0],
      /Location: src\/pages\/blog\/script\.ts:18:12/
    );
  });
});

test("warning reports use the warning channel", async () => {
  await captureConsole("warn", messages => {
    const reported = reportUserActionError("Optional listener ignored", {
      title: "Invalid Event Listener",
      file: "src/core/events.ts",
      line: 8,
      level: "warn"
    });

    assert.match(reported.message, /Invalid Event Listener/);
    assert.equal(messages.length, 1);
  });
});

test("directive expression failures include directive, expression, and element", async () => {
  const root = document.createElement("div");
  root.innerHTML = '<p data-vd-text="post.title"></p>';
  document.body.append(root);
  const state = createState({});

  await captureConsole("error", messages => {
    const cleanup = applyDirectives(root, state);

    assert.equal(root.querySelector("p").textContent, "");
    assert.equal(messages.length, 1);
    assert.match(messages[0], /\[VeloDom\] Expression Evaluation Error/);
    assert.match(messages[0], /Directive: data-vd-text/);
    assert.match(messages[0], /Expression: post\.title/);
    assert.match(messages[0], /Element: <p data-vd-text="post\.title"><\/p>/);

    cleanup();
  });
});

test("fatal reports replace the page once and render content as text", async () => {
  document.body.innerHTML = "<main>Application</main>";
  const error = new Error("<script>unsafe()</script>");
  error.stack = "";

  await captureConsole("error", () => {
    reportUserActionError(error, {
      title: "Navigation Crash",
      file: "src/core/page-router.ts",
      line: 188,
      column: 5,
      hint: "Check the page module.",
      fatal: true
    });
  });

  const screen = document.body.querySelector("section");

  assert.ok(screen);
  assert.equal(screen.querySelector("h1").textContent, "Navigation Crash");
  assert.match(screen.querySelector("p").textContent, /<script>unsafe\(\)<\/script>/);
  assert.equal(screen.querySelector("script"), null);
  assert.equal(document.body.style.display, "grid");
  assert.equal(document.documentElement.style.background, "#0b1220");

  renderFatalFrameworkError(new Error("Second fatal"), {
    title: "Replacement"
  });

  assert.equal(screen.isConnected, true);
  assert.equal(screen.querySelector("h1").textContent, "Navigation Crash");
  assert.doesNotMatch(document.body.textContent, /Replacement/);
});

async function captureConsole(method, callback) {
  const original = console[method];
  const messages = [];

  console[method] = message => {
    messages.push(String(message));
  };

  try {
    await callback(messages);
  } finally {
    console[method] = original;
  }
}
