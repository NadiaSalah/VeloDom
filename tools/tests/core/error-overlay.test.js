/**
 * ----------------------------------------
 * Tests: Structured Error Overlay
 * ----------------------------------------
 *
 * Verifies stable diagnostic IDs, hierarchical ownership, grouped reports,
 * bounded retention, and opt-in development UI cleanup.
 * ----------------------------------------
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
  groupVeloDomErrorReports,
  mountVeloDomErrorOverlay
} from "../../../packages/velodom/src/devtools.ts";
import { reportUserActionError } from "../../../packages/velodom/src/errors/error-reporter.ts";
import { installDom } from "../../test-support/dom.js";

const removeDom = installDom();

test.after(() => removeDom());

test.beforeEach(() => {
  document.body.innerHTML = "";
});

test("structured reports retain IDs, ownership, and normalized source frames", async () => {
  const error = new Error("Editor failed");
  error.stack = [
    "Error: Editor failed",
    "    at save (D:\\site\\src\\pages\\editor\\script.ts:14:8)",
    "    at navigate (D:\\site\\packages\\velodom\\src\\page-router.ts:480:5)"
  ].join("\n");

  await withoutConsoleError(() => {
    const report = reportUserActionError(error, {
      code: "VD_ROUTER_EDITOR",
      group: "router",
      title: "Editor Navigation",
      ownership: [
        { kind: "page", name: "editor" },
        { kind: "component", name: "editor/form" }
      ]
    });

    assert.equal(report.code, "VD_ROUTER_EDITOR");
    assert.equal(report.group, "router");
    assert.equal(report.rawMessage, "Editor failed");
    assert.deepEqual(report.location, {
      file: "src/pages/editor/script.ts",
      line: 14,
      column: 8
    });
    assert.equal(report.sourceStack.length, 2);
    assert.equal(report.sourceStack[0].internal, false);
    assert.equal(report.sourceStack[1].internal, true);
    assert.match(report.formatted, /Ownership: page:editor > component:editor\/form/);

    const compilerReport = reportUserActionError("Template failed", {
      code: "VD_COMPILER_TEMPLATE"
    });

    assert.equal(compilerReport.group, "compiler");
  });
});

test("development overlay groups reports and never owns recovery", async () => {
  const overlay = mountVeloDomErrorOverlay({ limit: 2 });

  await withoutConsoleError(() => {
    reportUserActionError("First request failed", {
      code: "VD_REQUEST_FAILED",
      group: "request",
      ownership: [{ kind: "request", name: "posts.get" }]
    });
    reportUserActionError("Route failed", {
      code: "VD_ROUTER_NAVIGATION_CRASH",
      group: "router"
    });
    reportUserActionError("Latest request failed", {
      code: "VD_REQUEST_FAILED",
      group: "request"
    });
  });

  const panel = document.querySelector("[data-vd-error-overlay]");
  const grouped = groupVeloDomErrorReports(overlay.reports);

  assert.equal(overlay.reports.length, 2);
  assert.equal(grouped.get("router")?.length, 1);
  assert.equal(grouped.get("request")?.length, 1);
  assert.equal(panel?.hidden, false);
  assert.match(panel?.textContent || "", /router \(1\)/);
  assert.match(panel?.textContent || "", /request \(1\)/);
  assert.doesNotMatch(panel?.textContent || "", /First request failed/);

  overlay.clear();
  assert.equal(panel?.hidden, true);
  overlay.destroy();
  assert.equal(panel?.isConnected, false);
});

async function withoutConsoleError(callback) {
  const original = console.error;

  console.error = () => {};
  try {
    await callback();
  } finally {
    console.error = original;
  }
}
