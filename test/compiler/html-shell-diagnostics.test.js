import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeHtmlShell
} from "../../packages/velodom/src/vite-plugin/html-shell-diagnostics.ts";

test("HTML shell diagnostics accept UTF-8 charset", () => {
  assert.deepEqual(
    analyzeHtmlShell('<!doctype html><meta charset="UTF-8">'),
    []
  );
});

test("HTML shell diagnostics warn when charset is missing", () => {
  const diagnostics = analyzeHtmlShell("<!doctype html><title>VeloDom</title>");

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].code, "VD_HTML_SHELL_UTF8");
  assert.match(diagnostics[0].message, /meta charset/);
});

test("HTML shell diagnostics warn when charset is not UTF-8", () => {
  const diagnostics = analyzeHtmlShell(`
    <!doctype html>
    <meta charset="windows-1256">
  `);

  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].line, 3);
  assert.match(diagnostics[0].message, /UTF-8/);
});
