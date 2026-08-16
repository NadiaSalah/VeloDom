import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeRtlCss
} from "../../src/core/vite-plugin/rtl-css-diagnostics.ts";

test("RTL CSS diagnostics suggest logical alternatives", () => {
  const diagnostics = analyzeRtlCss(`
    .card {
      margin-left: 1rem;
      padding-right: 2rem;
      text-align: right;
    }
  `, "src/pages/home/style.css");

  assert.deepEqual(diagnostics.map(diagnostic => ({
    property: diagnostic.property,
    alternative: diagnostic.alternative,
    line: diagnostic.line
  })), [
    {
      property: "margin-left",
      alternative: "margin-inline-start",
      line: 3
    },
    {
      property: "padding-right",
      alternative: "padding-inline-end",
      line: 4
    },
    {
      property: "text-align",
      alternative: "end",
      line: 5
    }
  ]);
});

test("RTL CSS diagnostics ignore comments and logical properties", () => {
  const diagnostics = analyzeRtlCss(`
    .card {
      /* margin-left: 1rem; */
      margin-inline-start: 1rem;
      text-align: start;
    }
  `);

  assert.deepEqual(diagnostics, []);
});
