import assert from "node:assert/strict";
import test from "node:test";
import {
  createState,
  computed,
  effect,
  mergeExposedMembers,
  watch
} from "../../../packages/velodom/src/reactive.ts";

test("optional derived-state helpers stay local to supplied state", () => {
  const state = createState({
    count: 1
  });
  const doubled = computed(state, current => current.count * 2);
  const changes = [];
  const stopWatching = watch(
    state,
    current => current.count,
    (value, previous) => changes.push([value, previous]),
    { immediate: true }
  );
  const runs = [];
  const stopEffect = effect(state, current => {
    const count = current.count;

    runs.push(`run:${count}`);

    return () => runs.push(`cleanup:${count}`);
  });

  assert.equal(doubled.value, 2);
  state.count = 2;

  assert.equal(doubled.value, 4);
  assert.deepEqual(changes, [
    [1, undefined],
    [2, 1]
  ]);
  assert.deepEqual(runs, [
    "run:1",
    "cleanup:1",
    "run:2"
  ]);

  stopWatching();
  stopEffect();
  doubled.dispose();
  state.count = 3;

  assert.equal(doubled.value, 4);
  assert.deepEqual(changes, [
    [1, undefined],
    [2, 1]
  ]);
  assert.deepEqual(runs, [
    "run:1",
    "cleanup:1",
    "run:2",
    "cleanup:2"
  ]);
});

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

test("component expose accepts plain object public values", () => {
  const state = createState({});

  mergeExposedMembers(state, {
    label: "Dialog",
    version: 1
  });

  assert.equal(state.label, "Dialog");
  assert.equal(state.version, 1);
});

test("component expose must be a plain object", () => {
  const state = createState({});

  assert.throws(
    () => mergeExposedMembers(state, ["open"]),
    /plain object/
  );
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
