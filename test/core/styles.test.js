import assert from "node:assert/strict";
import test from "node:test";
import { scopeCss } from "../../src/core/styles.ts";

test("scoped CSS supports leading global ancestor selectors", () => {
  assert.equal(
    scopeCss(
      ':global(html[dir="rtl"]) .card { text-align: start; }',
      '[data-vd-scope="abc"]'
    ),
    'html[dir="rtl"] [data-vd-scope="abc"] .card { text-align: start; }'
  );
});

test("scoped CSS preserves fully global selectors", () => {
  assert.equal(
    scopeCss(
      ":global(body.theme-dark) { color: white; }",
      '[data-vd-scope="abc"]'
    ),
    "body.theme-dark { color: white; }"
  );
});

test("scoped CSS supports inline global selector escapes", () => {
  assert.equal(
    scopeCss(
      ".card :global(.external-link) { color: blue; }",
      '[data-vd-scope="abc"]'
    ),
    '[data-vd-scope="abc"] .card .external-link { color: blue; }'
  );
});
