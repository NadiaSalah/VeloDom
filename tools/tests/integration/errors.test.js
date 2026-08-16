import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../../../packages/velodom/src/index.ts";
import { applyDirectives } from "../../../packages/velodom/src/directives.ts";
import {
  reportUserActionError
} from "../../../packages/velodom/src/errors/error-reporter.ts";
import {
  renderFatalFrameworkError
} from "../../../packages/velodom/src/errors/error-screen.ts";
import { createState } from "../../../packages/velodom/src/reactive.ts";
import {
  installDom,
  waitFor
} from "../../test-support/dom.js";

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
      file: "velodom/page-router.ts",
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

test("error reporter prefers source metadata from adapter loaders", async () => {
  const error = new Error("Template failed");

  error.stack = "";
  error.__vdFile = "src/pages/home/index.html";
  error.__vdHint = "Check src/pages/home/index.html.";

  await captureConsole("error", messages => {
    const reported = reportUserActionError(error, {
      title: "Navigation Crash",
      file: "velodom/page-router.ts",
      hint: "Fallback hint"
    });

    assert.deepEqual(reported.location, {
      file: "src/pages/home/index.html",
      line: 1,
      column: 1
    });
    assert.match(
      messages[0],
      /Location: src\/pages\/home\/index\.html:1:1/
    );
    assert.match(
      messages[0],
      /Hint: Check src\/pages\/home\/index\.html\./
    );
  });
});

test("warning reports use the warning channel", async () => {
  await captureConsole("warn", messages => {
    const reported = reportUserActionError("Optional listener ignored", {
      title: "Invalid Event Listener",
      file: "velodom/events.ts",
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

  await captureConsole("error", async messages => {
    const cleanup = await applyDirectives(root, state);

    assert.equal(root.querySelector("p").textContent, "");
    assert.equal(messages.length, 1);
    assert.match(messages[0], /\[VeloDom\] Expression Evaluation Error/);
    assert.match(messages[0], /Directive: data-vd-text/);
    assert.match(messages[0], /Expression: post\.title/);
    assert.match(messages[0], /Element: <p data-vd-text="post\.title"><\/p>/);

    cleanup();
  });
});

test("application error boundary renders a recoverable page fallback", async () => {
  document.body.innerHTML = '<main id="app"></main>';
  const contexts = [];
  const app = createApp({
    adapter: {
      pages: {
        html: {
          home: async () => "<h1>Home</h1>"
        },
        modules: {
          home: async () => ({
            init() {
              throw new Error("Home init failed");
            }
          })
        }
      }
    },
    errorBoundary(context) {
      contexts.push({
        page: context.page,
        phase: context.phase,
        title: context.title,
        hasRetry: typeof context.retry === "function",
        hasNavigate: typeof context.navigate === "function"
      });

      return "Recovered home page";
    }
  });

  await captureConsole("error", async messages => {
    await app.mount();

    assert.equal(messages.length, 1);
    assert.match(messages[0], /\[VeloDom\] Navigation Crash/);
  });

  const fallback = document.querySelector("[data-vd-error-boundary]");

  assert.equal(fallback?.getAttribute("role"), "alert");
  assert.equal(fallback?.textContent, "Recovered home page");
  assert.deepEqual(contexts, [
    {
      page: "home",
      phase: "navigation",
      title: "Navigation Crash",
      hasRetry: true,
      hasNavigate: true
    }
  ]);
  assert.notEqual(document.body.style.display, "grid");
});

test("application error boundary DOM fallback can retry navigation", async () => {
  document.body.innerHTML = '<main id="app"></main>';
  let attempts = 0;
  const app = createApp({
    adapter: {
      pages: {
        html: {
          home: async () => "<h1>Recovered</h1>"
        },
        modules: {
          home: async () => ({
            init() {
              attempts += 1;

              if (attempts === 1) {
                throw new Error("Temporary page failure");
              }
            }
          })
        }
      }
    },
    errorBoundary({ retry }) {
      const button = document.createElement("button");

      button.type = "button";
      button.textContent = "Retry";
      button.addEventListener("click", () => {
        retry();
      });

      return button;
    }
  });

  await captureConsole("error", async () => {
    await app.mount();
  });

  document.querySelector("button").click();

  await waitFor(() => {
    assert.equal(document.querySelector("h1")?.textContent, "Recovered");
  });
  assert.equal(attempts, 2);
});

test("component error boundary isolates a failing component", async () => {
  document.body.innerHTML = '<main id="app"></main>';
  const contexts = [];
  const app = createApp({
    adapter: {
      pages: {
        html: {
          home: async () => `
            <h1>Stable page</h1>
            <div data-vd-component="broken-widget"></div>
          `
        }
      },
      components: {
        html: {
          "broken-widget": async () => "<p>Widget shell</p>"
        },
        modules: {
          "broken-widget": async () => ({
            init() {
              throw new Error("Widget init failed");
            }
          })
        }
      }
    },
    errorBoundary(context) {
      contexts.push({
        component: context.component,
        page: context.page,
        phase: context.phase,
        title: context.title
      });

      return "Widget fallback";
    }
  });

  await captureConsole("error", async messages => {
    await app.mount();

    assert.equal(messages.length, 1);
    assert.match(messages[0], /\[VeloDom\] Component Crash: broken-widget/);
  });

  assert.equal(document.querySelector("h1")?.textContent, "Stable page");
  assert.equal(
    document.querySelector("[data-vd-error-boundary]")?.textContent,
    "Widget fallback"
  );
  assert.deepEqual(contexts, [
    {
      component: "broken-widget",
      page: "home",
      phase: "component",
      title: "Component Crash: broken-widget"
    }
  ]);
  assert.notEqual(document.body.style.display, "grid");
});

test("component error boundary DOM fallback can retry the component", async () => {
  document.body.innerHTML = '<main id="app"></main>';
  let attempts = 0;
  const app = createApp({
    adapter: {
      pages: {
        html: {
          home: async () => '<div data-vd-component="retry-widget"></div>'
        }
      },
      components: {
        html: {
          "retry-widget": async () => "<strong>Widget ready</strong>"
        },
        modules: {
          "retry-widget": async () => ({
            init() {
              attempts += 1;

              if (attempts === 1) {
                throw new Error("Retry widget failed once");
              }
            }
          })
        }
      }
    },
    errorBoundary({ retry }) {
      const button = document.createElement("button");

      button.type = "button";
      button.textContent = "Retry widget";
      button.addEventListener("click", () => {
        retry();
      });

      return button;
    }
  });

  await captureConsole("error", async () => {
    await app.mount();
  });

  document.querySelector("button").click();

  await waitFor(() => {
    assert.equal(document.querySelector("strong")?.textContent, "Widget ready");
  });
  assert.equal(attempts, 2);
});

test("fatal reports replace the page once and render content as text", async () => {
  document.body.innerHTML = "<main>Application</main>";
  const error = new Error("<script>unsafe()</script>");
  error.stack = "";

  await captureConsole("error", () => {
    reportUserActionError(error, {
      title: "Navigation Crash",
      file: "velodom/page-router.ts",
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
