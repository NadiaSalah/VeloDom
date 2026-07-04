import assert from "node:assert/strict";
import test from "node:test";
import { validateResourceAdapter } from "../../src/core/resource-adapter.ts";

test("resource adapter accepts lazy nested resource maps", () => {
  const adapter = validateResourceAdapter({
    pages: {
      html: {
        home: async () => "<main></main>"
      },
      modules: {},
      configs: {},
      styles: {}
    },
    components: {
      html: {},
      modules: {},
      styles: {}
    }
  });

  assert.equal(typeof adapter.pages.html.home, "function");
});

test("resource adapter fails clearly when pages are missing", () => {
  assert.throws(
    () => validateResourceAdapter({
      pages: {
        html: {}
      }
    }),
    error => (
      error.code === "VD_INVALID_ADAPTER"
      && error.__vdStage === "adapter"
    )
  );
});
