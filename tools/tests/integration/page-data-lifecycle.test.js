import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../../../packages/velodom/src/index.ts";
import { installDom } from "../../test-support/dom.js";

test("destroy releases the public page cache before the same app mounts again", async () => {
  const removeDom = installDom();
  document.body.innerHTML = '<div id="app"></div>';
  let calls = 0;
  const data = { cache: { maxAgeMs: 60_000 }, load: () => ({ title: `Article ${++calls}` }) };
  const app = createApp({ adapter: { pages: {
    html: { home: async () => '<h1 data-vd-text="data.title"></h1>' },
    data: { home: async () => data }
  } } });
  try {
    await app.mount();
    await app.navigate("/");
    assert.equal(calls, 1);
    await app.destroy();
    await app.mount();
    assert.equal(calls, 2);
    assert.equal(document.querySelector("h1")?.textContent, "Article 2");
  } finally {
    await app.destroy();
    removeDom();
  }
});

test("the public app preserves stale public data on refresh failure and recovers next visit", async () => {
  const removeDom = installDom();
  const originalNow = Date.now;
  let now = 0;
  let calls = 0;
  Date.now = () => now;
  document.body.innerHTML = '<div id="app"></div>';
  const data = {
    cache: { maxAgeMs: 10, staleWhileRevalidateMs: 20 },
    load: () => {
      if (++calls === 2) throw new Error("public refresh unavailable");
      return { title: `Article ${calls}` };
    }
  };
  const app = createApp({
    adapter: { pages: {
      html: { home: async () => '<h1 data-vd-text="data.title"></h1>' },
      data: { home: async () => data }
    } }
  });
  try {
    await app.mount();
    assert.equal(document.querySelector("h1")?.textContent, "Article 1");
    now = 20;
    await app.navigate("/");
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(document.querySelector("h1")?.textContent, "Article 1");
    assert.equal(calls, 2);
    now = 31;
    await app.navigate("/");
    assert.equal(document.querySelector("h1")?.textContent, "Article 3");
    assert.equal(calls, 3);
  } finally {
    await app.destroy();
    Date.now = originalNow;
    removeDom();
  }
});
