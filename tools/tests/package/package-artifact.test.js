import assert from "node:assert/strict";
import test from "node:test";
import { auditPackageArtifact } from "../../test-support/package-artifact.js";

const manifest = {
  name: "velodom", version: "1.0.0",
  files: ["lib", "types", "docs", "templates", "bin", "README.md"],
  exports: { ".": { import: "./lib/index.js", types: "./types/index.d.ts" } },
  bin: { vd: "./bin/vd.js" }
};
const budget = { size: 800, unpackedSize: 3000, entryCount: 10 };
const artifact = {
  name: "velodom", version: "1.0.0", size: 500, unpackedSize: 2000, entryCount: 8,
  files: ["package.json", "README.md", "lib/index.js", "lib/index.js.map",
    "types/index.d.ts", "docs/QUICK_START.md", "templates/default/_gitignore", "bin/vd.js"]
    .map(path => ({ path, size: 250 }))
};

test("artifact audit accepts source maps, declarations, portable docs and templates", () => {
  assert.deepEqual(auditPackageArtifact(artifact, manifest, budget), []);
});

test("artifact audit rejects accidental source and nested private/generated files", () => {
  for (const path of ["src/internal.ts", "examples/site.html", "tools/check.js",
    "docs/.env.local", "templates/default/.npmrc", "docs/npm_recovery_codes.txt",
    "templates/default/node_modules/a.js", "templates/default/dist/index.html",
    "docs/cache.tgz", "docs/private.key", "docs/../secret.txt"]) {
    const result = auditPackageArtifact({ ...artifact, files: [...artifact.files, { path, size: 1 }] }, manifest, budget);
    assert.ok(result.some(message => message.includes(path)), path);
  }
});

test("artifact audit checks exported entries and required content in the actual tarball", () => {
  for (const path of ["lib/index.js", "types/index.d.ts", "bin/vd.js", "docs/QUICK_START.md"]) {
    const result = auditPackageArtifact({ ...artifact, files: artifact.files.filter(file => file.path !== path) }, manifest, budget);
    assert.ok(result.some(message => message.startsWith("Missing")), path);
  }
});

test("artifact audit enforces download/install/count budgets and package identity", () => {
  for (const [field, limit] of Object.entries(budget)) {
    assert.ok(auditPackageArtifact({ ...artifact, [field]: limit + 1 }, manifest, budget)
      .some(message => message.startsWith(field)));
  }
  assert.ok(auditPackageArtifact({ ...artifact, name: "wrong" }, manifest, budget)
    .includes("Package identity mismatch."));
  assert.ok(auditPackageArtifact({ ...artifact, version: "2.0.0" }, manifest, budget)
    .includes("Package version mismatch."));
  assert.ok(auditPackageArtifact({ ...artifact, files: [...artifact.files, artifact.files[0]] }, manifest, budget)
    .includes("Duplicate file: package.json"));
});
