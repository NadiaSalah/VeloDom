import assert from "node:assert/strict";
import test from "node:test";
import { createPageEventHub } from "../../src/core/events.ts";

test("event hub supports on, off, once, emit, and clear", () => {
  const events = createPageEventHub();
  const received = [];
  const persistent = payload => {
    received.push(`on:${payload}`);
  };
  const removePersistent = events.on("post:saved", persistent);

  events.once("post:saved", payload => {
    received.push(`once:${payload}`);
  });
  events.emit("post:saved", 1);
  events.emit("post:saved", 2);

  assert.deepEqual(received, [
    "on:1",
    "once:1",
    "on:2"
  ]);

  removePersistent();
  events.emit("post:saved", 3);
  assert.equal(received.length, 3);

  events.on("post:saved", persistent);
  events.off("post:saved", persistent);
  events.emit("post:saved", 4);
  assert.equal(received.length, 3);

  events.on("post:saved", persistent);
  events.clear();
  events.emit("post:saved", 5);
  assert.equal(received.length, 3);
});
