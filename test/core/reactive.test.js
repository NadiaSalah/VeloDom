import assert from "node:assert/strict";
import test from "node:test";
import {
  createState,
  mergeExposedMembers
} from "../../src/core/reactive.ts";

test("component expose members are callable from local template state", () => {
  const state = createState({
    count: 0
  });

  mergeExposedMembers(state, {
    increment(step = 1) {
      this.count += step;
      return this.count;
    }
  });

  assert.equal(state.increment(2), 2);
  assert.equal(state.count, 2);
});

test("component expose cannot replace protected state members", () => {
  const state = createState({});

  assert.throws(
    () => mergeExposedMembers(state, {
      components: {}
    }),
    /conflicts with protected state/
  );
});
