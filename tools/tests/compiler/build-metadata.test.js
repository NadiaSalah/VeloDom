import assert from "node:assert/strict";
import test from "node:test";
import { createVeloDomBuildMetadata } from "../../../packages/velodom/src/build-metadata.ts";

test("Vite build metadata records Rollup modules without machine paths", () => {
  const metadata = createVeloDomBuildMetadata({
    "assets/main.js": {
      code: "export {};",
      dynamicImports: [],
      fileName: "assets/main.js",
      imports: [],
      isDynamicEntry: false,
      isEntry: true,
      modules: {
        "D:/project/src/pages/home/script.js": {
          originalLength: 14,
          renderedLength: 10
        },
        "D:/project/node_modules/pkg/index.js": {
          originalLength: 20,
          renderedLength: 12
        }
      },
      type: "chunk"
    },
    "assets/logo.svg": {
      fileName: "assets/logo.svg",
      source: "<svg />",
      type: "asset"
    }
  }, "D:/project");

  assert.equal(metadata.version, 1);
  assert.equal(metadata.chunks.length, 1);
  assert.deepEqual(metadata.chunks[0].modules.map(module => module.id), [
    "node_modules/pkg/index.js",
    "src/pages/home/script.js"
  ]);
  assert.equal(JSON.stringify(metadata).includes("D:/project"), false);
});
