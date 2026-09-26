import assert from "node:assert/strict";
import test from "node:test";
import { createLifecycleScope } from "../../../packages/velodom/src/lifecycle.ts";

test("lifecycle cleanup runs in reverse registration order", async () => {
  const order = [];
  const lifecycle = createLifecycleScope();

  lifecycle.context.onCleanup(() => {
    order.push("first");
  });
  lifecycle.context.onCleanup(async () => {
    order.push("second");
  });

  await lifecycle.dispose();

  assert.deepEqual(order, ["second", "first"]);
});

test("lifecycle aborts its signal before cleanup", async () => {
  const lifecycle = createLifecycleScope();
  let abortedDuringCleanup = false;

  lifecycle.context.onCleanup(() => {
    abortedDuringCleanup = lifecycle.context.signal.aborted;
  });

  await lifecycle.dispose();

  assert.equal(abortedDuringCleanup, true);
  assert.equal(lifecycle.disposed, true);
});

test("removed cleanup callbacks do not run", async () => {
  const lifecycle = createLifecycleScope();
  let called = false;
  const remove = lifecycle.context.onCleanup(() => {
    called = true;
  });

  remove();
  await lifecycle.dispose();

  assert.equal(called, false);
});

test("parent cancellation reaches child scopes and releases its listener on disposal", async t => {
  const parent = new AbortController();
  const remove = t.mock.method(parent.signal, "removeEventListener");
  const lifecycle = createLifecycleScope({}, parent.signal);
  let calls = 0;
  lifecycle.context.onCleanup(() => { calls++; });
  parent.abort();
  assert.equal(lifecycle.context.signal.aborted, true);
  await lifecycle.dispose();
  await lifecycle.dispose();
  assert.equal(calls, 1);
  assert.equal(remove.mock.callCount(), 1);
  assert.equal(createLifecycleScope({}, parent.signal).context.signal.aborted, true);
});

test("async cleanup registered by a late hook is immediately released and observed", async t => {
  const errors = t.mock.method(console, "error", () => {});
  const lifecycle = createLifecycleScope();
  await lifecycle.dispose();
  let released = false;
  lifecycle.context.onCleanup(async () => { released = true; throw new Error("late release failed"); });
  assert.equal(released, true);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.ok(errors.mock.callCount() > 0);
});
