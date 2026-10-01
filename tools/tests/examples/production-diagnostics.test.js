/**
 * ----------------------------------------
 * Module: Optional Production Diagnostics Tests
 * ----------------------------------------
 *
 * Proves that the application recipe is silent by default, redacts sensitive
 * payloads, fences aborted work, and cannot break a user action.
 * ----------------------------------------
 */

import assert from "node:assert/strict";
import test from "node:test";
import { applyDirectives } from "../../../packages/velodom/src/directives.ts";
import { createState } from "../../../packages/velodom/src/reactive.ts";
import { configureRequestRuntime } from "../../../packages/velodom/src/requests/request-router.ts";
import { createProductionDiagnostics } from "../../../examples/velodom-store/src/domain/diagnostics/production-diagnostics.js";
import { installDom, waitFor } from "../../test-support/dom.js";

test("diagnostics emit only allowlisted request and boundary metadata", () => {
  const reports = [];
  let time = 10;
  const diagnostics = createProductionDiagnostics({
    sink: report => reports.push(report),
    now: () => time,
    random: () => 0
  });
  const controller = new AbortController();
  const payload = {
    routeName: "catalog.list",
    signal: controller.signal,
    params: { password: "private-password", card: "4111111111111111" },
    session: { token: "private-token" }
  };

  assert.deepEqual(reports, [], "constructing the opt-in recipe starts no collector");
  diagnostics.requestHooks.beforeRequest(payload);
  time = 41;
  diagnostics.requestHooks.afterRequest({
    ...payload,
    ok: false,
    stage: "request",
    error: new Error("private-password")
  });
  diagnostics.recordBoundary({
    page: "admin/products/[id]/edit",
    phase: "navigation",
    diagnostic: {
      code: "VD_NAVIGATION_CRASH",
      group: "router",
      rawMessage: "private-token",
      sourceStack: [{ file: "/private/account.js" }]
    }
  });

  assert.deepEqual(reports, [
    { kind: "request", id: "diag-1", route: "catalog.list", ok: false, stage: "request", durationMs: 31 },
    { kind: "boundary", id: "diag-2", code: "VD_NAVIGATION_CRASH", group: "router", page: "admin/products/[id]/edit", phase: "navigation" }
  ]);
  assert.equal(JSON.stringify(reports).includes("private-"), false);
  diagnostics.destroy();
});

test("sampling, abort, teardown and failing sinks cannot affect requests", async () => {
  const reports = [];
  const noSamples = createProductionDiagnostics({ sink: report => reports.push(report), sampleRate: 0 });
  noSamples.recordBoundary({ diagnostic: { code: "VD_TEST" } });
  assert.deepEqual(reports, []);
  noSamples.destroy();

  const diagnostics = createProductionDiagnostics({ sink: () => { throw new Error("sink unavailable"); } });
  const aborted = new AbortController();
  const request = { signal: aborted.signal, routeName: "catalog.list" };
  assert.doesNotThrow(() => diagnostics.requestHooks.beforeRequest(request));
  aborted.abort();
  assert.doesNotThrow(() => diagnostics.requestHooks.afterRequest({ ...request, ok: true }));
  assert.doesNotThrow(() => diagnostics.recordBoundary({ diagnostic: { code: "VD_TEST" } }));
  diagnostics.destroy();
  assert.doesNotThrow(() => diagnostics.requestHooks.beforeRequest(request));

  const rejecting = createProductionDiagnostics({ sink: () => Promise.reject(new Error("offline")) });
  assert.doesNotThrow(() => rejecting.recordBoundary({ diagnostic: { code: "VD_TEST" } }));
  await new Promise(resolve => setTimeout(resolve, 0));
  rejecting.destroy();

  const brokenSampler = createProductionDiagnostics({
    sink: () => { throw new Error("should not run"); },
    random: () => { throw new Error("unavailable"); }
  });
  assert.doesNotThrow(() => brokenSampler.recordBoundary({ diagnostic: {} }));
  brokenSampler.destroy();
});

test("untrusted route and diagnostic labels are replaced, not forwarded", () => {
  const reports = [];
  const diagnostics = createProductionDiagnostics({ sink: report => reports.push(report) });
  diagnostics.recordBoundary({
    page: "/account?token=private-token",
    phase: "navigation",
    diagnostic: { code: "PRIVATE_CODE", group: "router" }
  });
  assert.equal(reports[0].page, "unknown");
  assert.equal(reports[0].code, "VD_UNKNOWN");
  diagnostics.destroy();
});

test("public request hooks can opt in without forwarding declarative request params", async () => {
  const removeDom = installDom();
  const reports = [];
  const diagnostics = createProductionDiagnostics({ sink: report => reports.push(report) });
  const root = document.createElement("main");
  root.innerHTML = '<button data-vd-request="catalog.load" data-vd-request-config="{ params: { token: secret }, target: \'result\' }">Load</button>';
  document.body.append(root);
  configureRequestRuntime({
    routes: { "catalog.load": () => ({ items: ["safe"] }) },
    hooks: diagnostics.requestHooks
  });
  const state = createState({ secret: "private-token", result: null });
  const cleanup = await applyDirectives(root, state);

  try {
    root.querySelector("button").click();
    await waitFor(() => assert.equal(reports.length, 1));
    assert.equal(reports[0].route, "catalog.load");
    assert.equal(reports[0].ok, true);
    assert.equal(JSON.stringify(reports).includes("private-token"), false);
  } finally {
    cleanup();
    diagnostics.destroy();
    configureRequestRuntime();
    removeDom();
  }
});
