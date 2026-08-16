import assert from "node:assert/strict";
import test from "node:test";
import {
  createSingleFileConfigModule,
  createSingleFileRuntimeModule,
  createSingleFileScriptModule,
  createSingleFileStyleModule,
  parseVeloDomSingleFile
} from "../../src/core/vite-plugin/single-file.ts";
import {
  createTemplateModule
} from "../../src/core/vite-plugin/index.ts";

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
        }
      };
    </config>
  `);

  assert.match(createSingleFileScriptModule(descriptor), /export const value/);
  assert.match(createSingleFileScriptModule(descriptor), /__vdScriptDefault/);
  assert.match(createSingleFileStyleModule(descriptor), /export const __vdStyle/);
  assert.match(createSingleFileStyleModule(descriptor), /main \{ color/);
  assert.doesNotMatch(createSingleFileConfigModule(descriptor), /entries/);
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
