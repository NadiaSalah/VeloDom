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
