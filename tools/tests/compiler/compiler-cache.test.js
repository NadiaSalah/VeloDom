/**
 * ----------------------------------------
 * Module: Compiler Cache Tests
 * ----------------------------------------
 *
 * Verifies deterministic keys, bounded LRU behavior, source invalidation,
 * option isolation, and exact-source diagnostic safety.
 * ----------------------------------------
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  createCompilerCacheKey,
  createIncrementalCompilerCache
} from "../../../packages/velodom/src/vite-plugin/compiler-cache.ts";

test("compiler cache keys normalize source and isolate compiler options", () => {
  const optimizer = () => undefined;
  const otherOptimizer = () => undefined;

  assert.equal(
    createCompilerCacheKey("<main>\r\nA</main>", {
      mode: "development"
    }),
    createCompilerCacheKey("<main>\nA</main>", {
      mode: "development"
    })
  );
  assert.notEqual(
    createCompilerCacheKey("<main>A</main>", {
      compiler: { optimizers: [{ name: "one", optimize: optimizer }] }
    }),
    createCompilerCacheKey("<main>A</main>", {
      compiler: { optimizers: [{ name: "one", optimize: otherOptimizer }] }
    })
  );
  assert.notEqual(
    createCompilerCacheKey("<main>A</main>", { mode: "development" }),
    createCompilerCacheKey("<main>A</main>", { mode: "production" })
  );
  assert.notEqual(
    createCompilerCacheKey("<main>A</main>", {}, "one.html"),
    createCompilerCacheKey("<main>A</main>", {}, "two.html")
  );
});

test("compiler cache reuses exact work and invalidates changed files", () => {
  const cache = createIncrementalCompilerCache(4);
  let compilations = 0;
  const compile = label => cache.getOrCompile({
    source: `<main>${label}</main>`,
    sourceFile: "C:\\app\\src\\pages\\home\\index.html",
    options: { mode: "development" }
  }, () => ({
    id: ++compilations,
    label
  }));

  const first = compile("Home");
  const warm = compile("Home");

  assert.equal(warm, first);
  assert.equal(compilations, 1);
  assert.deepEqual(cache.getStats(), {
    entries: 1,
    evictions: 0,
    hits: 1,
    invalidations: 0,
    maxEntries: 4,
    misses: 1
  });

  const changed = compile("Changed");

  assert.notEqual(changed, first);
  assert.equal(compilations, 2);
  assert.equal(cache.getStats().invalidations, 1);
  assert.equal(cache.getStats().entries, 1);
  assert.equal(
    cache.invalidate("C:/app/src/pages/home/index.html"),
    1
  );
  assert.equal(cache.getStats().entries, 0);
});

test("compiler cache evicts the least recently used entry", () => {
  const cache = createIncrementalCompilerCache(2);
  let compilations = 0;
  const compile = file => cache.getOrCompile({
    source: `<main>${file}</main>`,
    sourceFile: file,
    options: {}
  }, () => ++compilations);

  compile("a.html");
  compile("b.html");
  compile("a.html");
  compile("c.html");

  assert.equal(cache.getStats().entries, 2);
  assert.equal(cache.getStats().evictions, 1);
  assert.equal(cache.getStats().hits, 1);
  assert.equal(cache.invalidate("b.html"), 0);
  assert.equal(cache.getStats().invalidations, 0);

  compile("b.html");

  assert.equal(compilations, 4);
  assert.equal(cache.getStats().evictions, 2);
});
