import assert from "node:assert/strict";
import test from "node:test";
import { validateResourceAdapter } from "../../src/core/resource-adapter.ts";

test("resource adapter accepts lazy nested resource maps", () => {
  const manifestLoader = async () => ({
    directives: ["data-vd-text"],
    features: ["text"]
  });
  const adapter = validateResourceAdapter({
    pages: {
      html: {
        home: async () => "<main></main>"
      },
      manifests: {
        home: manifestLoader
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
  assert.notEqual(adapter.pages.manifests.home, manifestLoader);
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
      && error.__vdFile === "createApp({ adapter })"
    )
  );
});

test("resource adapter validates page SEO before runtime mounting", () => {
  assert.throws(
    () => validateResourceAdapter({
      pages: {
        html: {
          home: async () => "<main></main>"
        },
        configs: {
          home: {
            seo: {
              title: "Home"
            }
          }
        }
      }
    }),
    error => (
      /description must be a non-empty string/.test(error.message)
      && error.__vdFile === "src/pages/home/config.js"
    )
  );
});

test("resource adapter annotates user file loader failures", async () => {
  const adapter = validateResourceAdapter({
    pages: {
      html: {
        home: async () => {
          throw new Error("Template failed");
        }
      }
    }
  });

  await assert.rejects(
    () => adapter.pages.html.home(),
    error => (
      error.message === "Template failed"
      && error.__vdFile === "src/pages/home/index.html"
      && /index\.html/.test(error.__vdHint)
    )
  );
});
