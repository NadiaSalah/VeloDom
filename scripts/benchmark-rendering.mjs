import { performance } from "node:perf_hooks";
import { applyDirectives } from "../packages/velodom/src/directives.ts";
import { createState } from "../packages/velodom/src/reactive.ts";
import { installDom } from "../test-support/dom.js";

const BENCHMARKS = Object.freeze({
  PAGE_BINDINGS: Object.freeze({
    ITERATIONS: 80,
    WARMUP: 10
  }),
  LOOP_RENDERING: Object.freeze({
    ITERATIONS: 60,
    WARMUP: 8,
    INITIAL_ITEMS: 120,
    UPDATED_ITEMS: 180
  }),
  STABLE_LOOP_RENDERING: Object.freeze({
    ITERATIONS: 80,
    WARMUP: 10,
    ITEMS: 160
  })
});

const removeDom = installDom("http://velodom.benchmark/");

try {
  const results = [];

  results.push(await benchmarkPageBindings());
  results.push(await benchmarkLoopRendering());
  results.push(await benchmarkStableLoopRendering());

  console.log("VeloDom rendering benchmark");
  console.log("==========================");
  console.log("Environment: happy-dom, local Node process");
  console.log("Values: milliseconds per full mount/update/cleanup sample");
  console.log("");

  results.forEach(result => {
    console.log(`${result.name}`);
    console.log(`  samples: ${result.samples}`);
    console.log(`  median:  ${formatMs(result.median)}`);
    console.log(`  min:     ${formatMs(result.min)}`);
    console.log(`  max:     ${formatMs(result.max)}`);
    console.log(`  p95:     ${formatMs(result.p95)}`);
    console.log("");
  });
} finally {
  removeDom();
}

async function benchmarkPageBindings() {
  return runBenchmark({
    name: "page bindings: 100 text/class/style/value updates",
    iterations: BENCHMARKS.PAGE_BINDINGS.ITERATIONS,
    warmup: BENCHMARKS.PAGE_BINDINGS.WARMUP,
    run: async () => {
      const root = document.createElement("main");

      root.innerHTML = createPageTemplate(100);
      document.body.append(root);

      const state = createState({
        active: true,
        color: "rebeccapurple",
        count: 1,
        title: "Initial"
      });

      const cleanup = await applyDirectives(root, state);

      state.active = false;
      state.color = "teal";
      state.count = 2;
      state.title = "Updated";

      cleanup();
      root.remove();
    }
  });
}

async function benchmarkLoopRendering() {
  return runBenchmark({
    name: "loop rendering: 120 items updated to 180 items",
    iterations: BENCHMARKS.LOOP_RENDERING.ITERATIONS,
    warmup: BENCHMARKS.LOOP_RENDERING.WARMUP,
    run: async () => {
      const root = document.createElement("main");

      root.innerHTML = `
        <ul>
          <li data-vd-for="item in items" data-vd-key="item.id">
            <span data-vd-text="item.title"></span>
            <em data-vd-text="item.status"></em>
          </li>
        </ul>
      `;
      document.body.append(root);

      const state = createState({
        items: createItems(BENCHMARKS.LOOP_RENDERING.INITIAL_ITEMS, "new")
      });

      const cleanup = await applyDirectives(root, state);

      state.items = createItems(BENCHMARKS.LOOP_RENDERING.UPDATED_ITEMS, "done");

      cleanup();
      root.remove();
    }
  });
}

async function benchmarkStableLoopRendering() {
  return runBenchmark({
    name: "stable loop update: 160 items with unchanged structure",
    iterations: BENCHMARKS.STABLE_LOOP_RENDERING.ITERATIONS,
    warmup: BENCHMARKS.STABLE_LOOP_RENDERING.WARMUP,
    run: async () => {
      const root = document.createElement("main");

      root.innerHTML = `
        <ul>
          <li data-vd-for="item in items" data-vd-key="item.id">
            <span data-vd-text="theme + ': ' + item.title"></span>
            <em data-vd-text="item.status"></em>
          </li>
        </ul>
      `;
      document.body.append(root);

      const state = createState({
        items: createItems(BENCHMARKS.STABLE_LOOP_RENDERING.ITEMS, "new"),
        theme: "Initial"
      });

      const cleanup = await applyDirectives(root, state);

      state.theme = "Updated";

      cleanup();
      root.remove();
    }
  });
}

async function runBenchmark({
  name,
  iterations,
  warmup,
  run
}) {
  const samples = [];

  for (let index = 0; index < warmup + iterations; index += 1) {
    document.body.innerHTML = "";

    const startedAt = performance.now();

    await run();

    const duration = performance.now() - startedAt;

    if (index >= warmup) {
      samples.push(duration);
    }
  }

  return summarize(name, samples);
}

function summarize(name, samples) {
  const sorted = [...samples].sort((left, right) => left - right);

  return {
    name,
    samples: sorted.length,
    min: sorted[0],
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    max: sorted[sorted.length - 1]
  };
}

function percentile(sorted, ratio) {
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1)
  );

  return sorted[index];
}

function createPageTemplate(count) {
  return Array.from({ length: count }, (_, index) => `
    <article
      data-vd-class="{ active: active }"
      data-vd-style="{ color: color }"
    >
      <h2 data-vd-text="title + ' ${index + 1}'"></h2>
      <p data-vd-text="'Count: ' + count"></p>
      <input data-vd-value="title">
    </article>
  `).join("");
}

function createItems(count, status) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    status,
    title: `Post ${index + 1}`
  }));
}

function formatMs(value) {
  return `${value.toFixed(3)}ms`;
}
