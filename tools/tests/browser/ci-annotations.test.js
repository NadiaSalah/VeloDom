/**
 * ----------------------------------------
 * Module: Browser CI Annotation Tests
 * ----------------------------------------
 * Checks that browser failures remain visible in GitHub Actions without
 * copying page-body snapshots into public annotations.
 * ----------------------------------------
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { formatBrowserFailureAnnotations } from "../../scripts/browser/ci-annotations.mjs";

test("browser CI annotations identify the failing target and root error", () => {
  const annotations = formatBrowserFailureAnnotations([
    { label: "Chromium desktop", status: "passed" },
    {
      label: "Firefox desktop",
      status: "failed",
      error: new Error([
        "Browser step failed: routing",
        "Current URL: http://127.0.0.1:1234/features",
        "Current body: private page text",
        "page.waitForFunction: Timeout 30000ms exceeded."
      ].join("\n"))
    }
  ]);

  assert.equal(annotations.length, 1);
  assert.match(annotations[0], /Firefox desktop/);
  assert.match(annotations[0], /Browser step failed: routing/);
  assert.match(annotations[0], /page\.waitForFunction: Timeout/);
  assert.doesNotMatch(annotations[0], /private page text/);
  assert.doesNotMatch(annotations[0], /Current body/);
});

test("browser CI annotations escape workflow command data", () => {
  const [annotation] = formatBrowserFailureAnnotations([{
    label: "Firefox %0A desktop",
    status: "failed",
    error: new Error("launch failed\r\ntry again")
  }]);

  assert.match(annotation, /Firefox %250A desktop/);
  assert.doesNotMatch(annotation, /\r|\n/);
});
