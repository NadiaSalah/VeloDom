import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPluginConformance,
  createPluginManager
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
