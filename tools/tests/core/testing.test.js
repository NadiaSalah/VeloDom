import assert from "node:assert/strict";
import test from "node:test";
import {
  compileTestFixture,
  createRequestMock,
  dispatchTestEvent,
  inspectAccessibilitySmoke,
  mountTestComponent,
  mountTestPage,
  resolveTestRoute
} from "../../../packages/velodom/src/testing.ts";
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

test("testing helpers use compiler, router, request, event, and accessibility contracts", async () => {
  const compiled = compileTestFixture("<p vd-text=\"title\"></p>");
  assert.equal(compiled.manifest.features.includes("text"), true);

  const route = resolveTestRoute(
    "/posts/42?view=full#comments",
    ["home", "posts/[id]"],
    { "posts/[id]": { path: "/posts/:id" } }
  );
  assert.equal(route.page, "posts/[id]");
  assert.equal(route.params.id, "42");
  assert.equal(route.query.view, "full");
  assert.equal(route.hash, "comments");

  const request = createRequestMock(async value => ({ value }));
  assert.deepEqual(await request.handler("saved"), { value: "saved" });
  assert.deepEqual(request.calls, [["saved"]]);
  request.reset();
  assert.deepEqual(request.calls, []);

  const button = document.createElement("button");
  let clicks = 0;
  button.addEventListener("click", () => { clicks += 1; });
  const event = dispatchTestEvent(button, "click");
  assert.equal(clicks, 1);
  assert.equal(event.bubbles, true);

  const diagnostics = inspectAccessibilitySmoke("<img src=\"cover.png\">");
  assert.equal(diagnostics.some(item => item.code === "VD_A11Y_IMG_ALT"), true);
});
