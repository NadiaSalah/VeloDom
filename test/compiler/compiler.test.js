import assert from "node:assert/strict";
import test from "node:test";
import { compileTemplate } from "../../packages/compiler/src/index.js";

test("preferred directives compile to backward-compatible runtime names", () => {
  const result = compileTemplate(`
    <button
      vd-if="ready"
      vd-bind:disabled="saving"
      vd-on:click.prevent="save()"
    >
      Save
    </button>
  `, {
    filename: "button.html"
  });

  assert.match(result.html, /data-vd-if="ready"/);
  assert.match(result.html, /data-vd-disabled="saving"/);
  assert.match(result.html, /data-vd-onclick\.prevent="save\(\)"/);
  assert.equal(result.metadata.length, 3);
  assert.deepEqual(result.diagnostics, []);
});

test("legacy data-vd directives remain unchanged", () => {
  const source = '<h1 data-vd-text="title"></h1>';
  const result = compileTemplate(source);

  assert.equal(result.html, source);
  assert.equal(result.metadata[0].type, "legacy");
});

test("unknown directives produce source-aware diagnostics", () => {
  const result = compileTemplate('<div vd-unknown="value"></div>', {
    filename: "broken.html"
  });

  assert.equal(result.diagnostics.length, 1);
  assert.equal(result.diagnostics[0].filename, "broken.html");
  assert.equal(result.diagnostics[0].location.line, 1);
  assert.equal(result.diagnostics[0].code, "VD_COMPILER_UNKNOWN_DIRECTIVE");
});

test("script contents are not parsed as template tags", () => {
  const source = '<script>const value = left < right;</script><p vd-text="value"></p>';
  const result = compileTemplate(source);

  assert.match(result.html, /left < right/);
  assert.match(result.html, /data-vd-text="value"/);
  assert.equal(result.metadata.length, 1);
});

test("quoted greater-than characters do not close a start tag", () => {
  const result = compileTemplate('<p title="a > b" vd-show="visible"></p>');

  assert.match(result.html, /title="a > b"/);
  assert.match(result.html, /data-vd-show="visible"/);
});
