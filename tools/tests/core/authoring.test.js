import assert from "node:assert/strict";
import test from "node:test";
import {
  definePageConfig,
  definePlugin,
  defineRequestRoute,
  defineResourceAdapter
} from "../../../packages/velodom/src/authoring.ts";

test("authoring declaration helpers preserve normal application values", () => {
  const page = definePageConfig({
    path: "/about",
    seo: {
      title: "About",
      description: "Application-owned metadata."
    }
  });
  const route = defineRequestRoute({
    handler: () => ({ ok: true })
  });
  const plugin = definePlugin({
    setup() {}
  });
  const adapter = defineResourceAdapter({
    pages: {
      html: {
        home: async () => "<main></main>"
      }
    }
  });

  assert.equal(page.path, "/about");
  assert.equal(typeof route.handler, "function");
  assert.equal(typeof plugin.setup, "function");
  assert.equal(typeof adapter.pages.html.home, "function");
});
