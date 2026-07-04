import assert from "node:assert/strict";
import test from "node:test";
import { createState } from "../../src/core/reactive.ts";
import {
  createScope,
  evaluate,
  isIterable,
  readValue,
  writeValue
} from "../../src/core/directives/expression.ts";

test("expression helpers evaluate and update nested state", () => {
  const state = createState({
    count: 2,
    profile: {
      name: "Nadia"
    }
  });

  assert.equal(evaluate("count * 3", state), 6);
  assert.equal(readValue("profile.name", state), "Nadia");

  writeValue("profile.name", state, "VeloDom");

  assert.equal(state.profile.name, "VeloDom");
});

test("loop scope reads parent state and writes local variables", () => {
  const parent = createState({
    suffix: "!"
  });
  const scope = createScope(parent, {
    item: "HTML"
  });

  assert.equal(evaluate("item + suffix", scope), "HTML!");

  scope.item = "Compiler";

  assert.equal(scope.item, "Compiler");
  assert.equal(parent.item, undefined);
});

test("iterable detection rejects plain records", () => {
  assert.equal(isIterable([]), true);
  assert.equal(isIterable(new Set()), true);
  assert.equal(isIterable({}), false);
});
