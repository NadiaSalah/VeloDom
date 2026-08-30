import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createSingleFileConfigModule,
  createSingleFileRuntimeModule,
  createSingleFileScriptModule,
  createSingleFileStyleModule,
  parseVeloDomSingleFile
} from "../../../packages/velodom/src/vite-plugin/single-file.ts";
import {
  createTemplateModule,
  velodom
} from "../../../packages/velodom/src/vite-plugin/index.ts";

test("single-file modules parse VeloDom blocks", () => {
  const descriptor = parseVeloDomSingleFile(`
    <template>
      <main>
        <h1 vd-text="title"></h1>
      </main>
    </template>

    <script>
      export function init({ state }) {
        state.title = "About";
      }
    </script>

    <style>
      main { padding: 2rem; }
    </style>

    <config>
      export default {
        path: "/about",
        seo: {
          title: "About",
          description: "About VeloDom."
        }
      };
    </config>
  `, "src/pages/about.vd");

  assert.match(descriptor.template, /vd-text="title"/);
  assert.equal(descriptor.templateOffset > 0, true);
  assert.match(descriptor.script, /export function init/);
  assert.match(descriptor.style, /padding: 2rem/);
  assert.match(descriptor.config, /path: "\/about"/);
});

test("single-file template blocks compile through the normal template compiler", () => {
  const descriptor = parseVeloDomSingleFile(`
    <template>
      <button vd-on:click="increment()">
        Count: <span vd-text="count"></span>
      </button>
    </template>
  `);
  const module = createTemplateModule(descriptor.template, {
    mode: "production"
  });

  assert.match(module.code, /data-vd-onclick=\\"increment\(\)\\"/);
  assert.deepEqual(module.result.manifest.features.sort(), [
    "events",
    "text"
  ]);
});

test("single-file script, style, and config blocks become virtual modules", () => {
  const descriptor = parseVeloDomSingleFile(`
    <template><main></main></template>
    <script>export const value = 1;</script>
    <style>main { color: red; }</style>
    <config>
      export default {
        seo: {
          title: "Post",
          description: "Post page",
          entries: async () => []
        },
        prerender: {
          entries: async () => [{ path: "/post" }],
          render: async () => "<article>Post</article>"
        }
      };
    </config>
  `);

  assert.match(createSingleFileScriptModule(descriptor), /export const value/);
  assert.match(createSingleFileScriptModule(descriptor), /__vdScriptDefault/);
  assert.match(createSingleFileStyleModule(descriptor), /export const __vdStyle/);
  assert.match(createSingleFileStyleModule(descriptor), /main \{ color/);
  assert.doesNotMatch(createSingleFileConfigModule(descriptor), /entries/);
  assert.doesNotMatch(createSingleFileConfigModule(descriptor), /prerender/);
  assert.match(createSingleFileConfigModule(descriptor), /export \{ __vdConfig \}/);
});

test("single-file runtime modules expose template, script, style, and config", () => {
  const descriptor = parseVeloDomSingleFile(`
    <template><main vd-text="title"></main></template>
    <script>export function init() {}</script>
    <style>main { padding: 1rem; }</style>
    <config>export default { path: "/single-file" };</config>
  `);
  const template = createTemplateModule(descriptor.template, {
    mode: "production"
  });
  const moduleCode = createSingleFileRuntimeModule(descriptor, template.code);

  assert.match(moduleCode, /export default/);
  assert.match(moduleCode, /export function init/);
  assert.match(moduleCode, /export const __vdStyle/);
  assert.match(moduleCode, /export \{ __vdConfig \}/);
});

test("Vite extracts eager page config without compiling the lazy runtime module", async () => {
  const root = await mkdtemp(join(tmpdir(), "velodom-vd-config-"));
  const filename = join(root, "about.vd");
  const source = `
    <template><main>Lazy page marker</main></template>
    <script>export const state = { secretMarker: "lazy-script" };</script>
    <config>export default { path: "/company" };</config>
  `;

  await writeFile(filename, source, "utf8");

  try {
    const plugin = velodom();
    const configId = `${filename}?vd-config`;
    const loaded = await plugin.load.call({}, configId);

    assert.match(loaded.code, /path: "\/company"/);
    assert.doesNotMatch(loaded.code, /Lazy page marker|lazy-script/);
    assert.equal(
      plugin.transform.call({}, loaded.code, configId),
      null
    );

    const runtime = plugin.transform.call({
      error(error) {
        throw error;
      },
      warn() {}
    }, source, filename);

    assert.match(runtime.code, /Lazy page marker/);
    assert.match(runtime.code, /lazy-script/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("Vite reuses compiler work and invalidates it on hot update", () => {
  let optimizerRuns = 0;
  const plugin = velodom({
    compiler: {
      optimizers: [{
        name: "count-runs",
        optimize() {
          optimizerRuns += 1;
        }
      }]
    }
  });
  const filename = "C:/app/src/pages/about.vd";
  const source = "<template><main vd-text=\"title\"></main></template>";
  const context = {
    error(error) {
      throw error;
    },
    warn() {}
  };

  plugin.transform.call(context, source, filename);
  plugin.transform.call(context, source, filename);
  assert.equal(optimizerRuns, 1);

  plugin.handleHotUpdate({ file: filename });
  plugin.transform.call(context, source, filename);
  assert.equal(optimizerRuns, 2);
});

test("single-file modules require one template block", () => {
  assert.throws(
    () => parseVeloDomSingleFile("<script>export {};</script>"),
    /Missing <template> block/
  );

  assert.throws(
    () => parseVeloDomSingleFile(`
      <template><main></main></template>
      <template><section></section></template>
    `),
    /Duplicate <template> block/
  );
});
