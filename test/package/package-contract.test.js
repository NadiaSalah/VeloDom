import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(
  await readFile(
    new URL("../../package.json", import.meta.url),
    "utf8"
  )
);

test("published package boundaries use built allowlisted artifacts", () => {
  const publicEntries = [
    ".",
    "./assets",
    "./compiler",
    "./content",
    "./devtools",
    "./testing",
    "./vite",
    "./vite-plugin"
  ];

  assert.equal(manifest.private, true);
  assert.match(manifest.version, /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/);
  assert.equal(manifest.peerDependencies.typescript, ">=5.7");
  assert.equal(
    manifest.peerDependenciesMeta.typescript.optional,
    true
  );
  assert.deepEqual(manifest.bin, {
    "vd": "./bin/vd.js",
    "create-velodom": "./bin/create-velodom.js"
  });
  assert.deepEqual(manifest.files, [
    "bin",
    "docs",
    "lib",
    "types",
    "README.md",
    "BROWSERS.md",
    "CHANGELOG.md",
    "NOTES.md",
    "RELEASE_DECISION.md",
    "RELEASING.md",
    "todo.md"
  ]);

  publicEntries.forEach(entry => {
    const definition = manifest.exports[entry];

    assert.match(definition.import, /^\.\/lib\/.+\.js$/);
    assert.match(definition.types, /^\.\/types\/.+\.d\.ts$/);
    assert.equal(definition.default, definition.import);
  });
});
