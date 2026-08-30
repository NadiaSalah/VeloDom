/**
 * ----------------------------------------
 * Module: Compiler Cache Benchmark
 * ----------------------------------------
 *
 * Measures cold template compilation, repeated warm cache hits, and an
 * explicitly invalidated rebuild without enforcing machine-specific timing.
 * ----------------------------------------
 */

import { performance } from "node:perf_hooks";
import {
  createIncrementalCompilerCache
} from "../../packages/velodom/src/vite-plugin/compiler-cache.ts";
import {
  createTemplateModule
} from "../../packages/velodom/src/vite-plugin/index.ts";

const warmIterations = 250;
const filename = "src/pages/benchmark/index.html";
const source = createBenchmarkTemplate(180);
const options = {
  filename,
  mode: "production"
};
const cache = createIncrementalCompilerCache(16);
const compile = () => cache.getOrCompile({
  source,
  sourceFile: filename,
  options
}, () => createTemplateModule(source, options));
const cold = measure(compile);
const warmSamples = Array.from(
  { length: warmIterations },
  () => measure(compile).duration
);

cache.invalidate(filename);
const invalidated = measure(compile);
const stats = cache.getStats();

if (
  cold.value.code !== invalidated.value.code
  || stats.hits !== warmIterations
  || stats.misses !== 2
) {
  throw new Error("VeloDom compiler cache benchmark produced inconsistent results");
}

console.log("VeloDom compiler cache benchmark");
console.log("================================");
console.log("Environment: local Node process, build-time compiler only");
console.log(`Template directives: ${cold.value.result.metadata.length}`);
console.log(`Cold compile: ${formatMs(cold.duration)}`);
console.log(`Warm cache median (${warmIterations} hits): ${formatMs(percentile(warmSamples, 0.5))}`);
console.log(`Warm cache p95: ${formatMs(percentile(warmSamples, 0.95))}`);
console.log(`Invalidated rebuild: ${formatMs(invalidated.duration)}`);
console.log(`Cache stats: ${stats.hits} hits, ${stats.misses} misses, ${stats.invalidations} invalidation`);

/** Measures one synchronous build-time compiler operation. */
function measure(callback) {
  const startedAt = performance.now();
  const value = callback();

  return {
    duration: performance.now() - startedAt,
    value
  };
}

/** Returns one nearest-rank percentile from local timing samples. */
function percentile(samples, ratio) {
  const sorted = [...samples].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1)
  );

  return sorted[index];
}

/** Creates a representative directive-heavy page for cold/warm comparison. */
function createBenchmarkTemplate(count) {
  return `<main>${Array.from({ length: count }, (_, index) => `
    <article vd-class="{ active: activeId === ${index} }">
      <h2>{{ title }} ${index + 1}</h2>
      <a vd-bind:href="'/posts/' + ${index}" vd-nav>Open</a>
      <button vd-on:click="select(${index})">Select</button>
    </article>
  `).join("")}</main>`;
}

/** Formats one local duration without implying a cross-machine threshold. */
function formatMs(value) {
  return `${value.toFixed(3)}ms`;
}
