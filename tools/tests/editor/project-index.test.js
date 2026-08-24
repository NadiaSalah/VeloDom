import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  indexProjectPaths
} = require("../../../packages/velodom-vscode/project-index.js");

test("editor convention index discovers folder and single-file names", () => {
  const index = indexProjectPaths([
    "src/components/shared/card/index.html",
    "src/components/blog/post-card.vd",
    "src/pages/home/index.html",
    "src/pages/blog/[slug]/index.html",
    "src/pages/features.vd",
    "src/pages/ignored/script.js"
  ]);

  assert.deepEqual(index.componentNames, [
    "blog/post-card",
    "shared/card"
  ]);
  assert.deepEqual(index.routes, [
    "/",
    "/blog/:slug",
    "/features"
  ]);
  assert.equal(index.componentFiles["shared/card"], "src/components/shared/card/index.html");
  assert.equal(index.routeFiles["/blog/:slug"], "src/pages/blog/[slug]/index.html");
});
