import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { compileTemplate } from "../../../packages/velodom/src/compiler/index.ts";
import { applyDirectives } from "../../../packages/velodom/src/directives.ts";
import { createState } from "../../../packages/velodom/src/reactive.ts";
import { installDom } from "../../test-support/dom.js";

test("homepage's actual copyable first-feature snippets compile and respond to a click", async () => {
  const removeDom = installDom();
  let cleanup;
  try {
    const source = await readFile(new URL("../../../examples/velodom-blog/src/pages/home/index.html", import.meta.url), "utf8");
    const page = document.createElement("div");
    page.innerHTML = source;
    const snippets = [...page.querySelectorAll('section[aria-labelledby="first-feature"] pre[vd-pre] code')];
    assert.equal(snippets.length, 2);
    const [html, script] = snippets.map(code => code.textContent);
    assert.ok(html.includes("{{ count }}"));
    // Only repository-owned lesson code is executed; no fetched/user input.
    const lesson = await import(`data:text/javascript,${encodeURIComponent(script)}`);
    const state = createState(lesson.state);
    lesson.init({ state });
    const root = document.createElement("div");
    root.innerHTML = compileTemplate(html).html;
    document.body.append(root);
    cleanup = await applyDirectives(root, state);
    assert.equal(root.querySelector('[aria-live="polite"]').textContent, "Count: 0");
    root.querySelector("button").click();
    assert.equal(root.querySelector('[aria-live="polite"]').textContent, "Count: 1");
  } finally {
    cleanup?.();
    removeDom();
  }
});
