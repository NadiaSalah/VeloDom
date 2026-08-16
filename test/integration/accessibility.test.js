import assert from "node:assert/strict";
import test from "node:test";
import { applyDirectives } from "../../packages/velodom/src/directives.ts";
import { createPageRouter } from "../../packages/velodom/src/page-router.ts";
import { createState } from "../../packages/velodom/src/reactive.ts";
import {
  renderSeoDocument
} from "../../packages/velodom/src/vite-plugin/seo-renderer.ts";
import { installDom } from "../../test-support/dom.js";

const removeDom = installDom();

test.after(() => {
  removeDom();
});

test.beforeEach(() => {
  document.body.innerHTML = "";
  history.replaceState({}, "", "/");
});

test("keyboard event modifiers run only for matching keys", async () => {
  const root = document.createElement("section");

  root.innerHTML = `
    <button
      id="menu"
      data-vd-on-keydown.space="toggleMenu()"
      data-vd-on-keydown.esc="closeMenu()"
    >Menu</button>
  `;
  document.body.append(root);
  const state = createState({
    closed: 0,
    toggled: 0
  });

  state.toggleMenu = () => {
    state.toggled += 1;
  };
  state.closeMenu = () => {
    state.closed += 1;
  };

  const cleanup = await applyDirectives(root, state);
  const menu = root.querySelector("#menu");

  menu.dispatchEvent(new KeyboardEvent("keydown", {
    bubbles: true,
    key: "Enter"
  }));
  menu.dispatchEvent(new KeyboardEvent("keydown", {
    bubbles: true,
    key: " "
  }));
  menu.dispatchEvent(new KeyboardEvent("keydown", {
    bubbles: true,
    key: "Escape"
  }));

  assert.equal(state.toggled, 1);
  assert.equal(state.closed, 1);

  cleanup();
});

test("component mounting preserves focusable element order", async () => {
  document.body.innerHTML = '<main id="app"></main>';
  const router = createPageRouter({
    pages: {
      html: {
        home: async () => `
          <a id="before" href="/before">Before</a>
          <div data-vd-component="focus-card"></div>
          <button id="after" type="button">After</button>
        `
      }
    },
    components: {
      html: {
        "focus-card": async () => `
          <button id="component-action" type="button">Component action</button>
        `
      }
    }
  });

  await router.init();

  assert.deepEqual(readFocusableIds(document.getElementById("app")), [
    "before",
    "component-action",
    "after"
  ]);

  await router.destroy();
});

test("static SEO fallback emits semantic summary output", () => {
  const html = renderSeoDocument(
    '<!doctype html><html><head><title>App</title></head><body><div id="app"></div></body></html>',
    {
      title: "Accessible article",
      description: "Summary for visitors and crawlers.",
      summary: {
        heading: "Accessible article heading",
        text: "Readable fallback content."
      }
    }
  );

  document.documentElement.innerHTML = html
    .match(/<html[^>]*>([\s\S]*)<\/html>/i)?.[1] || "";

  const fallback = document.querySelector("[data-vd-seo-fallback]");

  assert.equal(fallback?.getAttribute("aria-label"), "Page summary");
  assert.equal(fallback?.querySelector("h1")?.textContent, "Accessible article heading");
  assert.equal(fallback?.querySelector("p")?.textContent, "Readable fallback content.");
});

function readFocusableIds(root) {
  return [...root.querySelectorAll([
    "a[href]",
    "button",
    "input",
    "select",
    "textarea",
    "[tabindex]"
  ].join(","))]
    .filter(el => !el.disabled)
    .filter(el => el.getAttribute("tabindex") !== "-1")
    .map(el => el.id);
}
