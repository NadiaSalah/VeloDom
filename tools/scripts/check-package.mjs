/**
 * ----------------------------------------
 * Module: Package Contract Audit
 * ----------------------------------------
 *
 * Validates the publish allowlist, built ESM entry points, generated
 * declarations, and rewritten import specifiers before npm creates a tarball.
 * ----------------------------------------
 */

import {
  access,
  readFile,
  readdir
} from "node:fs/promises";
import {
  join,
  resolve
} from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(
  fileURLToPath(new URL("../..", import.meta.url))
);
const packageRoot = join(workspaceRoot, "packages", "velodom");

const manifest = JSON.parse(
  await readFile(join(packageRoot, "package.json"), "utf8")
);
const violations = [];
const expectedExports = {
  ".": [
    "./lib/index.js",
    "./types/index.d.ts"
  ],
  "./compiler": [
    "./lib/compiler/index.js",
    "./types/compiler/index.d.ts"
  ],
  "./content": [
    "./lib/content.js",
    "./types/content.d.ts"
  ],
  "./assets": [
    "./lib/assets.js",
    "./types/assets.d.ts"
  ],
  "./devtools": [
    "./lib/devtools.js",
    "./types/devtools.d.ts"
  ],
  "./vite": [
    "./lib/adapters/vite.js",
    "./types/adapters/vite.d.ts"
  ],
  "./vite-plugin": [
    "./lib/vite-plugin/index.js",
    "./types/vite-plugin/index.d.ts"
  ],
  "./testing": [
    "./lib/testing.js",
    "./types/testing.d.ts"
  ]
};
const allowedPackageFiles = new Set([
  "LICENSE",
  "README.md",
  "bin",
  "lib",
  "types"
]);
const requiredKeywords = new Set([
  "frontend-framework",
  "html-first",
  "compiler-first",
  "vite"
]);

if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version)) {
  violations.push(`package version "${manifest.version}" is not valid SemVer`);
}

if (manifest.repository?.directory !== "packages/velodom") {
  violations.push(
    "repository.directory must identify packages/velodom in the monorepo"
  );
}

if (manifest.publishConfig?.access !== "public") {
  violations.push("publishConfig.access must be public for velodom");
}

if (!manifest.author?.name || !manifest.author?.url) {
  violations.push("package author name and URL are required");
}

const packageKeywords = new Set(manifest.keywords || []);

for (const keyword of requiredKeywords) {
  if (!packageKeywords.has(keyword)) {
    violations.push(`package keywords are missing "${keyword}"`);
  }
}

const packageScripts = JSON.stringify(manifest.scripts || {});

if (packageScripts.includes("tools/") || packageScripts.includes("../..")) {
  violations.push("package scripts must not depend on workspace-owned files");
}

if (manifest.scripts?.prepack !== "npm run package:build") {
  violations.push("prepack must build only the self-contained package");
}

const packageFiles = new Set(manifest.files || []);

if (manifest.peerDependencies?.typescript !== ">=5.7") {
  violations.push(
    "typescript must remain an optional >=5.7 peer for typed config builds"
  );
}

if (manifest.peerDependenciesMeta?.typescript?.optional !== true) {
  violations.push(
    "typescript peer dependency must remain optional for Vanilla projects"
  );
}

if (manifest.peerDependencies?.vite !== ">=6 <9") {
  violations.push(
    "vite must remain an optional >=6 <9 peer for Vite integrations"
  );
}

if (manifest.peerDependenciesMeta?.vite?.optional !== true) {
  violations.push(
    "vite peer dependency must remain optional for adapter-independent usage"
  );
}

for (const required of allowedPackageFiles) {
  if (!packageFiles.has(required)) {
    violations.push(`package files allowlist is missing "${required}"`);
  }
}

for (const entry of packageFiles) {
  if (!allowedPackageFiles.has(entry)) {
    violations.push(`package files allowlist contains unexpected "${entry}"`);
  }
}

for (const [name, target] of Object.entries(manifest.bin || {})) {
  if (typeof target !== "string" || !target.startsWith("./bin/")) {
    violations.push(`bin "${name}" must point at ./bin/*.js`);
    continue;
  }

  try {
    await access(join(packageRoot, target.slice(2)));
  } catch {
    violations.push(`bin "${name}" target is missing: ${target}`);
  }
}

for (const [name, targets] of Object.entries(expectedExports)) {
  const declaration = manifest.exports?.[name]?.types;
  const runtime = manifest.exports?.[name]?.import;

  if (runtime !== targets[0]) {
    violations.push(`export "${name}" must import "${targets[0]}"`);
  }

  if (declaration !== targets[1]) {
    violations.push(`export "${name}" must use types "${targets[1]}"`);
  }

  for (const target of targets) {
    try {
      await access(join(packageRoot, target.slice(2)));
    } catch {
      violations.push(`export "${name}" target is missing: ${target}`);
    }
  }
}

for (const file of await collectFiles(join(packageRoot, "lib"), ".js")) {
  const source = await readFile(file, "utf8");

  if (/(?:from\s+|import\()\s*["'][^"']+\.ts["']/.test(source)) {
    violations.push(`${file}: emitted JavaScript still imports TypeScript`);
  }
}

for (const file of await collectFiles(join(packageRoot, "types"), ".d.ts")) {
  const source = await readFile(file, "utf8");

  if (/(?:from\s+|import\()\s*["'][^"']+\.ts["']/.test(source)) {
    violations.push(`${file}: declaration still imports TypeScript source`);
  }
}

if (violations.length) {
  console.error([
    "VeloDom package contract check failed:",
    ...violations.map(violation => `- ${violation}`)
  ].join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `VeloDom package contract check passed (${manifest.version}).`
  );
}

async function collectFiles(directory, extension) {
  const entries = await readdir(directory, {
    withFileTypes: true
  });
  const nested = await Promise.all(
    entries.map(entry => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectFiles(path, extension);
      }

      return entry.isFile() && entry.name.endsWith(extension)
        ? [path.replaceAll("\\", "/")]
        : [];
    })
  );

  return nested.flat();
}
