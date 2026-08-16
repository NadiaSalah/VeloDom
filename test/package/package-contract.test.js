import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(
  await readFile(
    new URL("../../packages/velodom/package.json", import.meta.url),
    "utf8"
  )
);
const workspaceManifest = JSON.parse(
  await readFile(new URL("../../package.json", import.meta.url), "utf8")
);
const blogManifest = JSON.parse(
  await readFile(
    new URL("../../examples/blog/package.json", import.meta.url),
    "utf8"
  )
);
const blogViteConfig = await readFile(
  new URL("../../examples/blog/vite.config.js", import.meta.url),
  "utf8"
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
  assert.equal(manifest.peerDependencies.vite, ">=6 <9");
  assert.equal(manifest.peerDependenciesMeta.vite.optional, true);
  assert.deepEqual(manifest.bin, {
    "vd": "./bin/vd.js",
    "create-velodom": "./bin/create-velodom.js"
  });
  assert.deepEqual(manifest.files, [
    "bin",
    "lib",
    "types",
    "README.md",
    "LICENSE"
  ]);

  publicEntries.forEach(entry => {
    const definition = manifest.exports[entry];

    assert.match(definition.import, /^\.\/lib\/.+\.js$/);
    assert.match(definition.types, /^\.\/types\/.+\.d\.ts$/);
    assert.equal(definition.default, definition.import);
  });
});

test("workspace keeps the blog behind public package imports", () => {
  assert.deepEqual(workspaceManifest.workspaces, [
    "packages/velodom",
    "examples/blog"
  ]);
  assert.equal(blogManifest.dependencies.velodom, manifest.version);
  assert.equal(blogManifest.imports["#app/*"], "./src/*");
  assert.match(blogViteConfig, /from "velodom\/vite-plugin"/);
  assert.match(blogViteConfig, /find: "@"/);
  assert.doesNotMatch(blogViteConfig, /packages\/velodom\/src/);
});
