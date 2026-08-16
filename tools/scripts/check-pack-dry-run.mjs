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

const workspaceRoot = resolve(
  fileURLToPath(new URL("../..", import.meta.url))
);
const packageRoot = join(workspaceRoot, "packages", "velodom");
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
  const output = await run(npmCommand, [
    ...npmArguments,
    "pack",
    "--dry-run",
    "--ignore-scripts"
  ], {
    cwd: packageRoot,
    env: {
      ...process.env,
      npm_config_cache: cacheRoot
    }
  });

  process.stdout.write(output);
  console.log("VeloDom package dry-run check passed.");
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
