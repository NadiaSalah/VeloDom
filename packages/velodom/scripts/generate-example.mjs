/**
 * ----------------------------------------
 * Module: Published Example Generator
 * ----------------------------------------
 *
 * Generates the editable `velodomProj` example from the same scaffold used by
 * `create-velodom`, so the npm tarball never contains a stale second starter.
 * ----------------------------------------
 */

import {
  mkdir,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import {
  basename,
  dirname,
  join,
  resolve
} from "node:path";
import { fileURLToPath } from "node:url";
import { runVeloDomCli } from "../lib/cli.js";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const exampleRoot = join(packageRoot, "velodomProj");

assertSafeExamplePath(exampleRoot);
await rm(exampleRoot, {
  recursive: true,
  force: true
});
await mkdir(packageRoot, {
  recursive: true
});

const exitCode = await runVeloDomCli([
  "create",
  "project",
  "velodomProj"
], {
  cwd: packageRoot,
  stdout: () => {},
  stderr: message => {
    throw new Error(message);
  }
});

if (exitCode !== 0) {
  throw new Error(`Unable to generate the package example (exit ${exitCode}).`);
}

const packageManifest = JSON.parse(
  await readFile(join(packageRoot, "package.json"), "utf8")
);
const exampleManifestPath = join(exampleRoot, "package.json");
const exampleManifest = JSON.parse(
  await readFile(exampleManifestPath, "utf8")
);
exampleManifest.dependencies.velodom = `^${packageManifest.version}`;
await writeFile(
  exampleManifestPath,
  `${JSON.stringify(exampleManifest, null, 2)}\n`,
  "utf8"
);

await writeFile(
  join(exampleRoot, "README.md"),
  `# VeloDom editable example

This small project is included with the \`velodom\` npm package. Copy this
folder into your workspace, install its dependencies, and edit the files under
\`src/\` to learn the HTML-first conventions.

\`create-velodom\` and \`npx velodom@latest\` generate the same starter shape.

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
  "utf8"
);

function assertSafeExamplePath(path) {
  const root = resolve(packageRoot);
  const target = resolve(path);

  if (
    !target.startsWith(`${root}${process.platform === "win32" ? "\\" : "/"}`)
    || basename(target) !== "velodomProj"
  ) {
    throw new Error(`Refusing to generate outside the package example: ${target}`);
  }
}
