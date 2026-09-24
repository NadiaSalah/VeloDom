import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const manifest = JSON.parse(
  await readFile(
    new URL("../../../packages/velodom/package.json", import.meta.url),
    "utf8"
  )
);
const workspaceManifest = JSON.parse(
  await readFile(new URL("../../../package.json", import.meta.url), "utf8")
);
const blogManifest = JSON.parse(
  await readFile(
    new URL("../../../examples/velodom-blog/package.json", import.meta.url),
    "utf8"
  )
);
const storeManifest = JSON.parse(
  await readFile(
    new URL("../../../examples/velodom-store/package.json", import.meta.url),
    "utf8"
  )
);
const editorManifest = JSON.parse(
  await readFile(
    new URL("../../../packages/velodom-vscode/package.json", import.meta.url),
    "utf8"
  )
);
const createManifest = JSON.parse(
  await readFile(
    new URL("../../../packages/create-velodom/package.json", import.meta.url),
    "utf8"
  )
);
const createBinary = await readFile(
  new URL("../../../packages/create-velodom/bin/create-velodom.js", import.meta.url),
  "utf8"
);
const blogViteConfig = await readFile(
  new URL("../../../examples/velodom-blog/vite.config.js", import.meta.url),
  "utf8"
);
const storeViteConfig = await readFile(
  new URL("../../../examples/velodom-store/vite.config.js", import.meta.url),
  "utf8"
);

test("published package boundaries use built allowlisted artifacts", () => {
  const publicEntries = [
    ".",
    "./assets",
    "./compiler",
    "./content",
    "./cli",
    "./devtools",
    "./pwa",
    "./scaffolder",
    "./testing",
    "./vite",
    "./vite-plugin"
  ];

  assert.equal(manifest.private ?? false, false);
  assert.match(manifest.version, /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/);
  assert.equal(manifest.repository.directory, "packages/velodom");
  assert.equal(manifest.publishConfig.access, "public");
  assert.equal(manifest.author.name, "Nadia Salah");
  assert.match(manifest.author.url, /github\.com\/NadiaSalah/);
  assert.ok(manifest.keywords.includes("html-first"));
  assert.ok(manifest.keywords.includes("compiler-first"));
  assert.equal(manifest.peerDependencies.typescript, ">=5.7");
  assert.equal(
    manifest.peerDependenciesMeta.typescript.optional,
    true
  );
  assert.equal(manifest.peerDependencies.vite, ">=6 <9");
  assert.equal(manifest.peerDependenciesMeta.vite.optional, true);
  assert.deepEqual(manifest.bin, {
    "vd": "./bin/vd.js",
    "create-velodom": "./bin/create-velodom.js",
    "velodom": "./bin/velodom.js"
  });
  assert.deepEqual(manifest.files, [
    "AI_CONTEXT.md",
    "bin",
    "docs",
    "lib",
    "templates",
    "types",
    "README.md",
    "LICENSE"
  ]);
  assert.equal(manifest.scripts.prepack, "npm run package:build");
  assert.doesNotMatch(JSON.stringify(manifest.scripts), /tools\/|\.\.\/\.\./);

  publicEntries.forEach(entry => {
    const definition = manifest.exports[entry];

    assert.match(definition.import, /^\.\/lib\/.+\.js$/);
    assert.match(definition.types, /^\.\/types\/.+\.d\.ts$/);
    assert.equal(definition.default, definition.import);
  });
});

test("npm-create wrapper delegates to the shared Node-only CLI", () => {
  assert.equal(createManifest.name, "create-velodom");
  assert.equal(createManifest.private ?? false, false);
  assert.deepEqual(createManifest.bin, {
    "create-velodom": "./bin/create-velodom.js"
  });
  assert.equal(createManifest.dependencies.velodom, `^${manifest.version}`);
  assert.match(createBinary, /from "velodom\/cli"/);
  assert.doesNotMatch(createBinary, /copy|template|node:fs|node:child_process/i);
});

test("workspace maintenance commands resolve organized scripts and CI uses the stable command", async () => {
  for (const script of Object.values(workspaceManifest.scripts)) {
    for (const [, path] of script.matchAll(/node (tools\/scripts\/[^\s]+\.mjs)/g)) {
      assert.match(path, /^tools\/scripts\/(package|quality|browser|performance)\//);
      await access(new URL(`../../../${path}`, import.meta.url));
    }
  }
  const workflow = await readFile(new URL("../../../.github/workflows/release-browser-matrix.yml", import.meta.url), "utf8");
  assert.match(workflow, /run: npm run browser:check/);
  assert.match(workflow, /run: npm test/);
  assert.match(workflow, /run: npm run pack:report/);
  assert.match(workspaceManifest.scripts["browser:check"], /browser\/check-browser-e2e\.mjs/);
  assert.match(workspaceManifest.scripts["pack:check"], /npm run pack:report/);
});

test("workspace keeps consumers behind public package imports", () => {
  assert.deepEqual(workspaceManifest.workspaces, [
    "packages/create-velodom",
    "packages/velodom",
    "packages/velodom-vscode",
    "examples/velodom-blog",
    "examples/velodom-store"
  ]);
  assert.equal(blogManifest.dependencies.velodom, manifest.version);
  assert.equal(storeManifest.dependencies.velodom, manifest.version);
  assert.equal(editorManifest.private, true);
  assert.equal(editorManifest.dependencies.velodom, `^${manifest.version}`);
  assert.equal(blogManifest.imports["#app/*"], "./src/*");
  assert.match(blogViteConfig, /from "velodom\/vite-plugin"/);
  assert.match(blogViteConfig, /find: "@"/);
  assert.doesNotMatch(blogViteConfig, /packages\/velodom\/src/);
  assert.equal(storeManifest.imports["#app/*"], "./src/*");
  assert.match(storeViteConfig, /from "velodom\/vite-plugin"/);
  assert.match(storeViteConfig, /find: "@"/);
  assert.doesNotMatch(storeViteConfig, /packages\/velodom\/src/);
});
