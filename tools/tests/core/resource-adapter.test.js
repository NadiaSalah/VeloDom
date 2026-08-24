import assert from "node:assert/strict";
import test from "node:test";
import {
  assertResourceAdapterConformance,
  validateResourceAdapter
} from "../../../packages/velodom/src/resource-adapter.ts";

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

test("resource adapter accepts the documented versioned capability contract", () => {
  const adapter = validateResourceAdapter({
    version: 1,
    capabilities: [
      "resource-discovery",
      "page-config",
      "page-data",
      "layouts",
      "compiler-manifests"
    ],
    pages: {
      html: {
        home: async () => "<main></main>"
      }
    }
  });

  assert.equal(adapter.version, 1);
  assert.deepEqual(adapter.capabilities, [
      "resource-discovery",
      "page-config",
      "page-data",
      "layouts",
    "compiler-manifests"
  ]);
  assert.doesNotThrow(() => assertResourceAdapterConformance({
    pages: {
      html: {
        home: async () => "<main></main>"
      }
    }
  }));
});

test("resource adapter validates optional page data loaders", async () => {
  const adapter = validateResourceAdapter({
    pages: {
      data: {
        home: async () => ({
          load: () => ({
            title: "Home"
          })
        })
      },
      html: {
        home: async () => "<main></main>"
      }
    }
  });

  assert.equal(typeof adapter.pages.data.home, "function");
  assert.equal(
    typeof (await adapter.pages.data.home()).load,
    "function"
  );
});

test("resource adapter rejects unsupported versions and capabilities", () => {
  assert.throws(
    () => assertResourceAdapterConformance({
      version: 2,
      pages: {
        html: {
          home: async () => "<main></main>"
        }
      }
    }),
    /Unsupported resource adapter contract version/
  );
  assert.throws(
    () => assertResourceAdapterConformance({
      capabilities: ["server-runtime"],
      pages: {
        html: {
          home: async () => "<main></main>"
        }
      }
    }),
    /unsupported capability/
  );
});

test("resource adapter accepts optional layout resource maps", () => {
  const adapter = validateResourceAdapter({
    pages: {
      html: {
        home: async () => "<main></main>"
      },
      configs: {
        home: {
          layout: "marketing/default"
        }
      }
    },
    layouts: {
      html: {
        "marketing/default": async () => "<div><vd-page></vd-page></div>"
      },
      styles: {},
      manifests: {}
    }
  });

  assert.equal(typeof adapter.layouts.html["marketing/default"], "function");
  assert.equal(adapter.pages.configs.home.layout, "marketing/default");
});

test("resource adapter rejects invalid layout config values", () => {
  assert.throws(
    () => validateResourceAdapter({
      pages: {
        html: {
          home: async () => "<main></main>"
        },
        configs: {
          home: {
            layout: "../admin"
          }
        }
      }
    }),
    error => (
      error.code === "VD_INVALID_ADAPTER"
      && error.__vdFile === "src/pages/home/config.js"
      && /layout/.test(error.message)
    )
  );
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
