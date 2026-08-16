import assert from "node:assert/strict";
import test from "node:test";
import { isPlainObject } from "../../packages/velodom/src/shared/object.ts";
import {
  findProtectedStatePathKey,
  normalizeFolderPath
} from "../../packages/velodom/src/shared/path.ts";

test("plain-object validation accepts records and rejects arrays", () => {
  assert.equal(isPlainObject({ value: 1 }), true);
  assert.equal(isPlainObject(Object.create(null)), true);
  assert.equal(isPlainObject([]), false);
  assert.equal(isPlainObject(null), false);
});

test("folder paths normalize separators and reject traversal", () => {
  assert.equal(normalizeFolderPath("/admin//dashboard/"), "admin/dashboard");
  assert.equal(normalizeFolderPath("../admin"), "");
});

test("protected state paths are detected across dot and bracket notation", () => {
  assert.equal(findProtectedStatePathKey("user.profile.name"), "");
  assert.equal(findProtectedStatePathKey("user['__proto__'].name"), "__proto__");
  assert.equal(findProtectedStatePathKey("state.components.modal"), "components");
});
