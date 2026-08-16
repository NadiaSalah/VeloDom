import assert from "node:assert/strict";
import test from "node:test";
import {
  mountTestComponent,
  mountTestPage
} from "../../src/core/testing.ts";
import { installDom } from "../../test-support/dom.js";

const removeDom = installDom();

test.after(() => {
  removeDom();
});

test.beforeEach(() => {
  document.body.innerHTML = "";
});

test("mountTestPage applies directives and returns cleanup", async () => {
  const mounted = await mountTestPage(
    "<h1 vd-text=\"title\"></h1>",
    {
      state: {
        title: "Testing VeloDom"
      }
    }
  );

  assert.equal(mounted.root.querySelector("h1").textContent, "Testing VeloDom");

  mounted.state.title = "Updated";

  assert.equal(mounted.root.querySelector("h1").textContent, "Updated");

  await mounted.cleanup();

  assert.equal(document.body.children.length, 0);
});

test("mountTestComponent mounts in-memory component resources", async () => {
  const mounted = await mountTestComponent(
    "card",
    {
      html: `
        <article>
          <h2 vd-text="title"></h2>
          <button vd-on:click="rename()">Rename</button>
        </article>
      `,
      module: {
        init({ state, props }) {
          state.title = props.title;
          state.rename = () => {
            state.title = "Renamed";
          };
        }
      }
    },
    {
      props: {
        title: "Mounted Card"
      }
    }
  );

  assert.equal(mounted.root.querySelector("h2").textContent, "Mounted Card");

  mounted.root.querySelector("button").click();

  assert.equal(mounted.root.querySelector("h2").textContent, "Renamed");

  await mounted.cleanup();
});
