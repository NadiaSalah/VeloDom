import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeVeloDomDocument,
  getVeloDomDirectiveCompletions
} from "../../src/core/compiler/index.ts";

test("language service remaps single-file template diagnostics to the source document", () => {
  const source = `<script>export {};</script>
<template>
  <img src="/cover.png">
</template>`;
  const analysis = analyzeVeloDomDocument({
    source,
    filename: "src/pages/home.vd"
  });
  const imageOffset = source.indexOf("<img");

  assert.equal(analysis.singleFile, true);
  assert.equal(analysis.diagnostics[0].offset, imageOffset);
  assert.equal(analysis.diagnostics[0].location.line, 3);
  assert.ok(analysis.diagnostics.some(diagnostic => (
    diagnostic.code === "VD_A11Y_IMG_DIMENSIONS"
  )));
});

test("language service publishes preferred directive completions", () => {
  const labels = getVeloDomDirectiveCompletions().map(item => item.label);

  assert.ok(labels.includes("vd-text"));
  assert.ok(labels.includes("vd-on:*"));
});
