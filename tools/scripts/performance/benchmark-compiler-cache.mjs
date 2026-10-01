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
} from "../../../packages/velodom/src/vite-plugin/compiler-cache.ts";
import {
  createTemplateModule
} from "../../../packages/velodom/src/vite-plugin/index.ts";

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

const graph = createProjectGraph();
const graphCache = createIncrementalCompilerCache(graph.length + 1);
const graphCompile = resource => graphCache.getOrCompile({
  source: resource.source,
  sourceFile: resource.filename,
  options: { filename: resource.filename, mode: "production" }
}, () => createTemplateModule(resource.source, {
  filename: resource.filename,
  mode: "production"
}));
const graphCold = measure(() => graph.map(graphCompile));
const graphWarm = measure(() => graph.map(graphCompile));
const changedComponent = graph.find(resource => resource.kind === "component");

if (!changedComponent) throw new Error("Large project fixture has no components");

graphCache.invalidate(changedComponent.filename);
const graphInvalidated = measure(() => graphCompile(changedComponent));
const graphStats = graphCache.getStats();
const expectedCodeBytes = graphCold.value.reduce((size, result) => (
  size + Buffer.byteLength(result.code)
), 0);

if (
  graphWarm.value.some((result, index) => result !== graphCold.value[index])
  || graphInvalidated.value.code !== graphCold.value[graph.indexOf(changedComponent)].code
  || graphStats.hits !== graph.length
  || graphStats.misses !== graph.length + 1
  || graphStats.invalidations !== 1
  || graphStats.entries !== graph.length
) {
  throw new Error("Large project compiler graph lost warm reuse or targeted invalidation");
}

console.log("");
console.log("Deterministic larger-project compiler graph");
console.log(`Resources: ${graph.filter(resource => resource.kind === "page").length} pages, ${graph.filter(resource => resource.kind === "component").length} components`);
console.log(`Generated module source: ${(expectedCodeBytes / 1024).toFixed(1)} KiB (not browser bundle size)`);
console.log(`Cold graph compile: ${formatMs(graphCold.duration)}`);
console.log(`Warm graph compile: ${formatMs(graphWarm.duration)}`);
console.log(`One-component invalidated rebuild: ${formatMs(graphInvalidated.duration)}`);
console.log(`Cache stats: ${graphStats.hits} hits, ${graphStats.misses} misses, ${graphStats.invalidations} invalidation, ${graphStats.entries} retained`);

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

/** Keeps the measured graph fixed and larger than either reference consumer. */
function createProjectGraph() {
  const components = Array.from({ length: 32 }, (_, index) => ({
    kind: "component",
    filename: `src/components/catalog/card-${index}/index.html`,
    source: `<article><h2>{{ title }}</h2><p vd-text="description"></p><button vd-on:click="select(${index})">Select</button></article>`
  }));
  const pages = Array.from({ length: 80 }, (_, index) => ({
    kind: "page",
    filename: `src/pages/catalog/department-${Math.floor(index / 10)}/page-${index}/index.html`,
    source: `<main><h1>{{ title }}</h1><vd-component name="catalog/card-${index % components.length}"></vd-component><a href="/catalog/${index + 1}" vd-nav>Next</a></main>`
  }));

  return [...components, ...pages];
}

/** Formats one local duration without implying a cross-machine threshold. */
function formatMs(value) {
  return `${value.toFixed(3)}ms`;
}
