/**
 * ----------------------------------------
 * Module: Package Dry-Run Audit
 * ----------------------------------------
 *
 * Runs npm's package dry-run with an isolated temporary cache so release
 * checks do not depend on the user's global npm cache permissions.
 * ----------------------------------------
 */

import {
  mkdtemp,
  readFile,
  rm
} from "node:fs/promises";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  join,
  resolve,
  sep
} from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { auditPackageArtifact } from "../../test-support/package-artifact.js";

const workspaceRoot = resolve(
  fileURLToPath(new URL("../../..", import.meta.url))
);
// Bound installed tooling/docs as well as compressed download size. Source maps
// remain intentional debugging content; they are not application runtime bytes.
const packageBudgets = {
  velodom: { size: 800 * 1024, unpackedSize: 3500 * 1024, entryCount: 400 },
  "create-velodom": { size: 8 * 1024, unpackedSize: 24 * 1024, entryCount: 10 }
};
const temporaryRoot = await mkdtemp(
  join(tmpdir(), "velodom-pack-dry-run-")
);
const cacheRoot = join(temporaryRoot, "npm-cache");
const npmCommand = process.platform === "win32"
  ? process.execPath
  : "npm";
const npmArguments = process.platform === "win32"
  ? [
    join(
      dirname(process.execPath),
      "node_modules",
      "npm",
      "bin",
      "npm-cli.js"
    )
  ]
  : [];

try {
  for (const [name, budget] of Object.entries(packageBudgets)) {
    const packageRoot = join(workspaceRoot, "packages", name);
    const manifest = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
    const output = await run(npmCommand, [
      ...npmArguments,
      "pack",
      "--dry-run",
      "--ignore-scripts",
      "--json"
    ], {
      cwd: packageRoot,
      env: {
        ...process.env,
        npm_config_cache: cacheRoot
      }
    });

    const [artifact] = JSON.parse(output);
    const violations = auditPackageArtifact(artifact, manifest, budget);
    if (violations.length) throw new Error(`${name} pack audit failed:\n${violations.join("\n")}`);
    console.log(`${name}: ${artifact.entryCount} files; ${(artifact.size / 1024).toFixed(1)} KiB packed; ${(artifact.unpackedSize / 1024).toFixed(1)} KiB installed.`);
    const groups = new Map();
    for (const file of artifact.files) {
      const group = file.path.startsWith("lib/") && file.path.endsWith(".map") ? "lib source maps" : file.path.split("/")[0];
      groups.set(group, (groups.get(group) || 0) + file.size);
    }
    for (const [group, bytes] of groups) console.log(`  ${group}: ${(bytes / 1024).toFixed(1)} KiB`);
  }
  console.log("Both package content and size gates passed (no publication).");
} finally {
  if (process.env.VELODOM_KEEP_PACK_DRY_RUN !== "1") {
    assertSafeTemporaryRoot(temporaryRoot);
    await rm(temporaryRoot, {
      recursive: true,
      force: true
    });
  } else {
    console.log(`Package dry-run cache kept at ${temporaryRoot}`);
  }
}

function assertSafeTemporaryRoot(directory) {
  const resolvedTemp = resolve(tmpdir());
  const resolvedDirectory = resolve(directory);

  if (
    !resolvedDirectory.startsWith(`${resolvedTemp}${sep}`)
    || !basename(resolvedDirectory).startsWith(
      "velodom-pack-dry-run-"
    )
  ) {
    throw new Error(
      `Refusing to remove unexpected dry-run directory: ${resolvedDirectory}`
    );
  }
}

function run(command, args, options) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      ...options,
      shell: false,
      stdio: [
        "ignore",
        "pipe",
        "pipe"
      ]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", chunk => {
      stdout += chunk;
    });
    child.stderr.on("data", chunk => {
      stderr += chunk;
    });
    child.on("error", rejectPromise);
    child.on("close", code => {
      if (code === 0) {
        resolvePromise(stdout);
        return;
      }

      rejectPromise(new Error([
        `Command failed (${code}): ${command} ${args.join(" ")}`,
        stdout,
        stderr
      ].filter(Boolean).join("\n")));
    });
  });
}
