import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { VD_PLUGIN } from "../../../packages/velodom/src/constants.ts";
import {
  assertPluginConformance,
  createPluginManager,
  inspectPluginConformance
} from "../../../packages/velodom/src/plugins.ts";

test("plugins setup in order and clean up in reverse order", async () => {
  const order = [];
  const manager = createPluginManager([
    () => {
      order.push("setup:first");
      return () => {
        order.push("cleanup:first");
      };
    },
    {
      setup() {
        order.push("setup:second");
      },
      cleanup() {
        order.push("cleanup:second");
      }
    }
  ]);

  await manager.setup();
  await manager.destroy();

  assert.deepEqual(order, [
    "setup:first",
    "setup:second",
    "cleanup:second",
    "cleanup:first"
  ]);
});

test("invalid plugins fail during manager creation", () => {
  assert.throws(
    () => createPluginManager([{}]),
    /must be a function/
  );
});

test("plugin conformance accepts public forms without installing them", () => {
  assert.doesNotThrow(() => assertPluginConformance(() => {}));
  assert.doesNotThrow(() => assertPluginConformance({
    setup() {},
    cleanup() {}
  }));
  assert.throws(
    () => assertPluginConformance({}),
    /must be a function/
  );
});

test("plugin manifests are inspected without executing third-party setup", () => {
  let setupCalls = 0;
  const report = inspectPluginConformance({
    manifest: {
      name: "@example/search-tools",
      version: "2.1.0",
      velodom: "^1.0.0",
      capabilities: ["browser", "build"]
    },
    setup() {
      setupCalls += 1;
    }
  }, {
    frameworkVersion: "1.0.0",
    target: "build"
  });

  assert.equal(report.compatible, true);
  assert.equal(setupCalls, 0);
  assert.deepEqual(report.manifests, [{
    name: "@example/search-tools",
    version: "2.1.0",
    velodom: "^1.0.0",
    capabilities: ["browser", "build"]
  }]);
});

test("plugin conformance reports compatibility, target, and pair conflicts", () => {
  const report = inspectPluginConformance([
    manifestPlugin({
      name: "theme-a",
      velodom: ">=2.0.0 <3.0.0",
      capabilities: ["build"],
      conflicts: ["theme-b"]
    }),
    manifestPlugin({ name: "theme-b" }),
    manifestPlugin({ name: "theme-b" })
  ], {
    frameworkVersion: "1.0.0",
    target: "browser"
  });

  assert.equal(report.compatible, false);
  assert.deepEqual(
    report.diagnostics.map(item => item.code).sort(),
    [
      "VD_PLUGIN_CAPABILITY",
      "VD_PLUGIN_COMPATIBILITY",
      "VD_PLUGIN_CONFLICT",
      "VD_PLUGIN_DUPLICATE"
    ]
  );
  assert.throws(
    () => createPluginManager([
      manifestPlugin({
        name: "node-only",
        capabilities: ["node"]
      })
    ]),
    /VD_PLUGIN_CAPABILITY/
  );
});

test("plugin manifests reject malformed ranges and metadata", () => {
  const report = inspectPluginConformance(manifestPlugin({
    name: "Bad Plugin",
    version: "latest",
    velodom: "one day",
    capabilities: ["browser", "browser"],
    conflicts: ["Bad Plugin"]
  }));

  assert.equal(report.compatible, false);
  assert.ok(report.diagnostics.length >= 4);
  assert.throws(
    () => assertPluginConformance(manifestPlugin({ velodom: "^2.0.0" })),
    /VD_PLUGIN_COMPATIBILITY/
  );
});

test("plugin compatibility defaults stay synchronized with the package version", async () => {
  const packageJson = JSON.parse(await readFile(
    new URL("../../../packages/velodom/package.json", import.meta.url),
    "utf8"
  ));

  assert.equal(VD_PLUGIN.FRAMEWORK_VERSION, packageJson.version);
});

function manifestPlugin(overrides = {}) {
  return {
    manifest: {
      name: "example-plugin",
      version: "1.0.0",
      velodom: "^1.0.0",
      capabilities: ["browser"],
      ...overrides
    },
    setup() {}
  };
}
