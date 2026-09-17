/**
 * ----------------------------------------
 * Module: npm-create Package Audit
 * ----------------------------------------
 *
 * Packs `velodom` and `create-velodom`, installs both tarballs into an isolated
 * consumer, and executes the installed npm-create wrapper without registry
 * or workspace resolution.
 * ----------------------------------------
 */

import { spawn } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const velodomRoot = join(workspaceRoot, "packages", "velodom");
const createRoot = join(workspaceRoot, "packages", "create-velodom");
const temporaryRoot = await mkdtemp(join(tmpdir(), "create-velodom-consumer-"));
const artifactsRoot = join(temporaryRoot, "artifacts");
const consumerRoot = join(temporaryRoot, "consumer");
const cacheRoot = join(temporaryRoot, "npm-cache");
const npmCommand = process.platform === "win32" ? process.execPath : "npm";
const npmArguments = process.platform === "win32"
  ? [join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")]
  : [];

try {
  await mkdir(artifactsRoot, { recursive: true });
  await mkdir(consumerRoot, { recursive: true });
  const velodomTarball = await pack(velodomRoot);
  const createTarball = await pack(createRoot);

  await writeFile(join(consumerRoot, "package.json"), `${JSON.stringify({
    name: "create-velodom-consumer",
    private: true,
    version: "0.0.0"
  }, null, 2)}\n`);
  await run(npmCommand, [
    ...npmArguments,
    "install",
    velodomTarball,
    createTarball,
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--no-package-lock",
    "--offline"
  ], {
    cwd: consumerRoot,
    env: { ...process.env, npm_config_cache: cacheRoot }
  });

  const generatedName = "generated-empty";
  await run(process.execPath, [
    join(consumerRoot, "node_modules", "create-velodom", "bin", "create-velodom.js"),
    generatedName,
    "--template",
    "empty",
    "--javascript",
    "--no-eslint",
    "--no-prettier",
    "--no-git",
    "--no-install"
  ], { cwd: consumerRoot });

  const generatedManifest = JSON.parse(await readFile(
    join(consumerRoot, generatedName, "package.json"),
    "utf8"
  ));

  if (generatedManifest.name !== generatedName) {
    throw new Error("Installed create-velodom did not personalize package.json");
  }
  if (!generatedManifest.dependencies?.velodom?.startsWith("^")) {
    throw new Error("Installed create-velodom did not inject a VeloDom version");
  }
  await access(join(consumerRoot, generatedName, "src", "pages", "home", "index.html"));

  console.log("Packed create-velodom wrapper consumer check passed.");
} finally {
  assertSafeTemporaryRoot(temporaryRoot);
  await rm(temporaryRoot, { recursive: true, force: true });
}

async function pack(packageRoot) {
  const output = await run(npmCommand, [
    ...npmArguments,
    "pack",
    "--ignore-scripts",
    "--pack-destination",
    artifactsRoot
  ], {
    cwd: packageRoot,
    env: { ...process.env, npm_config_cache: cacheRoot }
  });
  const tarballName = output.trim().split(/\r?\n/).filter(Boolean).at(-1);

  if (!tarballName) throw new Error(`npm pack returned no tarball for ${packageRoot}`);
  const tarball = join(artifactsRoot, basename(tarballName));
  await access(tarball);
  return tarball;
}

function assertSafeTemporaryRoot(directory) {
  const resolvedTemp = resolve(tmpdir());
  const resolvedDirectory = resolve(directory);

  if (
    !resolvedDirectory.startsWith(`${resolvedTemp}${sep}`)
    || !basename(resolvedDirectory).startsWith("create-velodom-consumer-")
  ) {
    throw new Error(`Refusing to remove unexpected directory: ${resolvedDirectory}`);
  }
}

function run(command, args, options) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      ...options,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.once("error", rejectPromise);
    child.once("close", code => {
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
